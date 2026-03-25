import { getLogger } from './logger';
import { notifyJobComplete, notifyError } from './notifications';

const log = getLogger('job-queue');

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type Job<T = unknown, R = unknown> = {
  id: string;
  name: string;
  data: T;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: R;
  error?: Error;
  attempts: number;
  maxAttempts: number;
};

export type JobHandler<T = unknown, R = unknown> = (data: T) => Promise<R>;

export type JobQueueOptions = {
  /** Maximum concurrent jobs (default: 1) */
  concurrency?: number;
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Delay between retries in ms (default: 5000) */
  retryDelay?: number;
  /** Enable Slack notifications (default: true) */
  enableNotifications?: boolean;
};

const DEFAULT_OPTIONS: Required<JobQueueOptions> = {
  concurrency: 1,
  maxAttempts: 3,
  retryDelay: 5000,
  enableNotifications: true,
};

/**
 * In-memory job queue implementation.
 * Can be replaced with Redis/BullMQ for production use.
 */
export class JobQueue<T = unknown, R = unknown> {
  private readonly name: string;
  private readonly handler: JobHandler<T, R>;
  private readonly options: Required<JobQueueOptions>;
  private readonly jobs: Map<string, Job<T, R>> = new Map();
  private readonly queue: string[] = [];
  private runningCount = 0;
  private isProcessing = false;
  private jobIdCounter = 0;

  constructor(name: string, handler: JobHandler<T, R>, options?: JobQueueOptions) {
    this.name = name;
    this.handler = handler;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Add a job to the queue.
   */
  add(data: T, jobName?: string): string {
    const id = `${this.name}-${++this.jobIdCounter}-${Date.now()}`;
    const job: Job<T, R> = {
      id,
      name: jobName ?? this.name,
      data,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: this.options.maxAttempts,
    };

    this.jobs.set(id, job);
    this.queue.push(id);

    log.info('ジョブをキューに追加しました', {
      jobId: id,
      jobName: job.name,
      queueLength: this.queue.length,
    });

    // Start processing if not already running
    this.processQueue();

    return id;
  }

  /**
   * Get a job by ID.
   */
  getJob(id: string): Job<T, R> | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs.
   */
  getAllJobs(): Job<T, R>[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status.
   */
  getJobsByStatus(status: JobStatus): Job<T, R>[] {
    return this.getAllJobs().filter((job) => job.status === status);
  }

  /**
   * Get queue statistics.
   */
  getStats(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const jobs = this.getAllJobs();
    return {
      pending: jobs.filter((j) => j.status === 'pending').length,
      running: jobs.filter((j) => j.status === 'running').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      total: jobs.length,
    };
  }

  /**
   * Clear completed and failed jobs older than specified age.
   */
  cleanup(maxAgeMs: number = 3600000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt.getTime() < cutoff
      ) {
        this.jobs.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      log.info('古いジョブをクリーンアップしました', { removed });
    }

    return removed;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.runningCount < this.options.concurrency) {
        const jobId = this.queue.shift();
        if (!jobId) break;

        const job = this.jobs.get(jobId);
        if (!job || job.status !== 'pending') continue;

        this.runningCount++;
        this.processJob(job).finally(() => {
          this.runningCount--;
          // Continue processing remaining jobs
          if (this.queue.length > 0) {
            this.processQueue();
          }
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: Job<T, R>): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();
    job.attempts++;

    log.info('ジョブを開始します', {
      jobId: job.id,
      jobName: job.name,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
    });

    const startTime = Date.now();

    try {
      const result = await this.handler(job.data);
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;

      const duration = Date.now() - startTime;

      log.info('ジョブが完了しました', {
        jobId: job.id,
        jobName: job.name,
        durationMs: duration,
      });

      if (this.options.enableNotifications) {
        await notifyJobComplete(job.name, true, { duration });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      job.error = err;

      log.error('ジョブでエラーが発生しました', error, {
        jobId: job.id,
        jobName: job.name,
        attempt: job.attempts,
      });

      if (job.attempts < job.maxAttempts) {
        // Retry
        job.status = 'pending';
        this.queue.push(job.id);

        log.info('ジョブをリトライします', {
          jobId: job.id,
          nextAttempt: job.attempts + 1,
          retryDelayMs: this.options.retryDelay,
        });

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay));
      } else {
        // Final failure
        job.status = 'failed';
        job.completedAt = new Date();

        const duration = Date.now() - startTime;

        if (this.options.enableNotifications) {
          await notifyJobComplete(job.name, false, {
            duration,
            errors: [err.message],
          });
          await notifyError(`ジョブ実行失敗: ${job.name}`, err, {
            jobId: job.id,
            attempts: String(job.attempts),
          });
        }
      }
    }
  }
}

// Factory function for creating typed job queues
export function createJobQueue<T, R>(
  name: string,
  handler: JobHandler<T, R>,
  options?: JobQueueOptions,
): JobQueue<T, R> {
  return new JobQueue(name, handler, options);
}

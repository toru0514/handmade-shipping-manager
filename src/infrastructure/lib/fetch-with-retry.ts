import { getLogger } from './logger';

const log = getLogger('fetch-with-retry');

export type FetchWithRetryOptions = {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[];
};

const DEFAULT_OPTIONS: Required<FetchWithRetryOptions> = {
  timeout: 30000,
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export class FetchTimeoutError extends Error {
  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`);
    this.name = 'FetchTimeoutError';
  }
}

export class FetchRetryExhaustedError extends Error {
  public readonly lastError: Error;
  public readonly attempts: number;

  constructor(url: string, attempts: number, lastError: Error) {
    super(`Request to ${url} failed after ${attempts} attempts: ${lastError.message}`);
    this.name = 'FetchRetryExhaustedError';
    this.lastError = lastError;
    this.attempts = attempts;
  }
}

function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeout);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof FetchTimeoutError) {
    return true;
  }
  if (error instanceof TypeError) {
    // Network errors typically throw TypeError
    return true;
  }
  return false;
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: FetchWithRetryOptions,
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error('No attempts made');

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, opts.timeout);

      if (!response.ok && opts.retryableStatusCodes.includes(response.status)) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        log.warn('リトライ可能なHTTPエラー', {
          url,
          status: response.status,
          attempt,
          maxRetries: opts.maxRetries,
        });

        if (attempt < opts.maxRetries) {
          const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);
          log.debug('リトライ待機中', { delayMs: delay, nextAttempt: attempt + 1 });
          await sleep(delay);
          continue;
        }

        throw new Error(errorMessage);
      }

      if (attempt > 1) {
        log.info('リトライ成功', { url, successfulAttempt: attempt });
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error)) {
        log.error('リトライ不可のエラー', error, { url, attempt });
        throw error;
      }

      log.warn('リトライ可能なエラー発生', {
        url,
        attempt,
        maxRetries: opts.maxRetries,
        errorMessage: lastError.message,
      });

      if (attempt < opts.maxRetries) {
        const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);
        log.debug('リトライ待機中', { delayMs: delay, nextAttempt: attempt + 1 });
        await sleep(delay);
      }
    }
  }

  throw new FetchRetryExhaustedError(url, opts.maxRetries, lastError);
}

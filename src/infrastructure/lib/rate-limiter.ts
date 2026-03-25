import { getLogger } from './logger';

const log = getLogger('rate-limiter');

export type RateLimiterConfig = {
  /** Maximum number of tokens in the bucket */
  maxTokens: number;
  /** Tokens to refill per interval */
  refillRate: number;
  /** Refill interval in milliseconds */
  refillInterval: number;
};

/**
 * Token bucket rate limiter implementation.
 * Default configuration: 60 requests per minute for Google Sheets API.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly config: RateLimiterConfig;

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = {
      maxTokens: config?.maxTokens ?? 60,
      refillRate: config?.refillRate ?? 60,
      refillInterval: config?.refillInterval ?? 60000, // 1 minute
    };
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const intervalsElapsed = Math.floor(timePassed / this.config.refillInterval);

    if (intervalsElapsed > 0) {
      const tokensToAdd = intervalsElapsed * this.config.refillRate;
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
      log.debug('トークン補充完了', {
        tokensAdded: tokensToAdd,
        currentTokens: this.tokens,
      });
    }
  }

  /**
   * Try to acquire a token. Returns true if successful, false if rate limited.
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    log.warn('レート制限に達しました', {
      currentTokens: this.tokens,
      maxTokens: this.config.maxTokens,
    });
    return false;
  }

  /**
   * Wait until a token is available, then acquire it.
   * @param maxWaitMs Maximum time to wait in milliseconds (default: 30000)
   */
  async acquire(maxWaitMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (!this.tryAcquire()) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        throw new RateLimitExceededError(maxWaitMs);
      }

      // Wait for a fraction of the refill interval
      const waitTime = Math.min(this.config.refillInterval / 10, maxWaitMs - elapsed);
      log.debug('レート制限待機中', { waitTimeMs: waitTime });
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get current available tokens.
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until next token refill in milliseconds.
   */
  getTimeUntilRefill(): number {
    const timeSinceLastRefill = Date.now() - this.lastRefillTime;
    return Math.max(0, this.config.refillInterval - timeSinceLastRefill);
  }
}

export class RateLimitExceededError extends Error {
  constructor(maxWaitMs: number) {
    super(`Rate limit exceeded after waiting ${maxWaitMs}ms`);
    this.name = 'RateLimitExceededError';
  }
}

// Default rate limiter for Google Sheets API (60 requests per minute)
let defaultRateLimiter: TokenBucketRateLimiter | null = null;

export function getGoogleSheetsRateLimiter(): TokenBucketRateLimiter {
  if (!defaultRateLimiter) {
    defaultRateLimiter = new TokenBucketRateLimiter({
      maxTokens: 60,
      refillRate: 60,
      refillInterval: 60000,
    });
  }
  return defaultRateLimiter;
}

/**
 * Decorator function to wrap an async function with rate limiting.
 */
export function withRateLimit<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  rateLimiter: TokenBucketRateLimiter = getGoogleSheetsRateLimiter(),
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    await rateLimiter.acquire();
    return fn(...args);
  };
}

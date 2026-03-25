export interface Logger {
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn('[DualWrite]', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error('[DualWrite]', message, context);
  }
}

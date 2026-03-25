export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLogLevel()];
}

function formatError(
  error: unknown,
): { name: string; message: string; stack?: string } | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown>,
  error?: unknown,
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context) {
    entry.context = context;
  }

  if (data && Object.keys(data).length > 0) {
    entry.data = data;
  }

  if (error) {
    entry.error = formatError(error);
  }

  return entry;
}

function output(entry: LogEntry): void {
  const json = JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(json);
      break;
    case 'warn':
      console.warn(json);
      break;
    case 'debug':
      console.debug(json);
      break;
    default:
      console.log(json);
  }
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: unknown, data?: Record<string, unknown>): void;
  child(context: string): Logger;
}

function createLogger(context?: string): Logger {
  return {
    debug(message: string, data?: Record<string, unknown>): void {
      if (!shouldLog('debug')) return;
      output(createLogEntry('debug', message, context, data));
    },

    info(message: string, data?: Record<string, unknown>): void {
      if (!shouldLog('info')) return;
      output(createLogEntry('info', message, context, data));
    },

    warn(message: string, data?: Record<string, unknown>): void {
      if (!shouldLog('warn')) return;
      output(createLogEntry('warn', message, context, data));
    },

    error(message: string, error?: unknown, data?: Record<string, unknown>): void {
      if (!shouldLog('error')) return;
      output(createLogEntry('error', message, context, data, error));
    },

    child(childContext: string): Logger {
      const newContext = context ? `${context}:${childContext}` : childContext;
      return createLogger(newContext);
    },
  };
}

export const logger = createLogger();

export function getLogger(context: string): Logger {
  return logger.child(context);
}

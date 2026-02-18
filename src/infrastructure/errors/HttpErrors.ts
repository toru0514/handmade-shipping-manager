export type ErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export abstract class HttpError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  protected constructor(message: string, code: ErrorCode, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends HttpError {
  constructor(message: string = '認証エラーが発生しました') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = '対象が見つかりませんでした') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends HttpError {
  constructor(message: string = '入力値が不正です') {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ExternalServiceError extends HttpError {
  constructor(message: string = '外部サービスでエラーが発生しました') {
    super(message, 'EXTERNAL_SERVICE_ERROR', 503);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string = '内部エラーが発生しました') {
    super(message, 'INTERNAL_SERVER_ERROR', 500);
  }
}

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export function toApiErrorResponse(error: HttpError): ApiErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
}

export function normalizeHttpError(
  error: unknown,
  fallbackMessage: string = '内部エラーが発生しました',
): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  return new InternalServerError(fallbackMessage);
}

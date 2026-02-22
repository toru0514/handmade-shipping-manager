import { NextRequest, NextResponse } from 'next/server';
import { IssueShippingLabelUseCase } from '@/application/usecases/IssueShippingLabelUseCase';
import {
  InvalidLabelIssueInputError,
  InvalidLabelIssueOperationError,
  OrderNotFoundError,
} from '@/application/usecases/IssueShippingLabelErrors';
import { ClickPostDryRunCompletedError } from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import { createContainer } from '@/infrastructure/di/container';
import {
  NotFoundError,
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';
type Env = Readonly<Record<string, string | undefined>>;
export async function createIssueShippingLabelUseCase(
  env: Env = process.env,
): Promise<IssueShippingLabelUseCase> {
  return createContainer(env).getIssueShippingLabelUseCase();
}

let issueShippingLabelUseCaseFactory = createIssueShippingLabelUseCase;

export function setIssueShippingLabelUseCaseFactoryForTest(
  factory: typeof createIssueShippingLabelUseCase,
): void {
  issueShippingLabelUseCaseFactory = factory;
}

export function resetIssueShippingLabelUseCaseFactoryForTest(): void {
  issueShippingLabelUseCaseFactory = createIssueShippingLabelUseCase;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const error = new ValidationError('リクエストボディが不正です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  if (typeof body !== 'object' || body === null) {
    const error = new ValidationError('リクエストボディが不正です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  const parsedBody = body as Record<string, unknown>;
  const shippingMethod = parsedBody.shippingMethod;
  if (typeof shippingMethod !== 'string' || shippingMethod.trim().length === 0) {
    const error = new ValidationError('配送方法は必須です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    const useCase = await issueShippingLabelUseCaseFactory();
    const result = await useCase.execute({
      orderId,
      shippingMethod: shippingMethod.trim(),
    });
    return NextResponse.json(result);
  } catch (error) {
    // ドライラン完了は正常終了（ブラウザで手動支払いを促す）
    if (error instanceof ClickPostDryRunCompletedError) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message:
          'ドライラン完了: 確認画面まで到達しました。ブラウザで支払いを手動で完了してください。',
      });
    }

    if (error instanceof OrderNotFoundError) {
      const httpError = new NotFoundError(error.message);
      return NextResponse.json(toApiErrorResponse(httpError), { status: httpError.statusCode });
    }

    if (
      error instanceof InvalidLabelIssueInputError ||
      error instanceof InvalidLabelIssueOperationError
    ) {
      const httpError = new ValidationError(error.message);
      return NextResponse.json(toApiErrorResponse(httpError), { status: httpError.statusCode });
    }

    const normalizedError = normalizeHttpError(error, '伝票発行に失敗しました');
    console.error('伝票発行エラー:', error);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  InvalidShipmentInputError,
  InvalidShipmentOperationError,
  OrderNotFoundError,
} from '@/application/usecases/MarkOrderAsShippedErrors';
import { createContainer } from '@/infrastructure/di/container';
import {
  NotFoundError,
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';

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
  const trackingNumber = parsedBody.trackingNumber;

  if (typeof shippingMethod !== 'string' || shippingMethod.trim().length === 0) {
    const error = new ValidationError('配送方法は必須です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  if (
    trackingNumber !== undefined &&
    trackingNumber !== null &&
    typeof trackingNumber !== 'string'
  ) {
    const error = new ValidationError('追跡番号は文字列で指定してください');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    const container = createContainer();
    const useCase = container.getMarkOrderAsShippedUseCase();
    const result = await useCase.execute({
      orderId,
      shippingMethod: shippingMethod.trim(),
      trackingNumber: typeof trackingNumber === 'string' ? trackingNumber : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      const error = new NotFoundError(err.message);
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }

    if (err instanceof InvalidShipmentInputError || err instanceof InvalidShipmentOperationError) {
      const error = new ValidationError(err.message);
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }

    const normalizedError = normalizeHttpError(err, '発送完了の記録に失敗しました');
    console.error('発送完了更新エラー:', err);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

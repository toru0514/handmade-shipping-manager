import { NextRequest, NextResponse } from 'next/server';
import {
  InvalidShipmentInputError,
  InvalidShipmentOperationError,
  OrderNotFoundError,
} from '@/application/usecases/MarkOrderAsShippedErrors';
import { createContainer } from '@/infrastructure/di/container';
import { normalizeHttpError, toApiErrorResponse } from '@/infrastructure/errors/HttpErrors';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  const parsedBody = body as Record<string, unknown>;
  const shippingMethod = parsedBody.shippingMethod;
  const trackingNumber = parsedBody.trackingNumber;

  if (typeof shippingMethod !== 'string' || shippingMethod.trim().length === 0) {
    return NextResponse.json({ error: '配送方法は必須です' }, { status: 400 });
  }

  if (
    trackingNumber !== undefined &&
    trackingNumber !== null &&
    typeof trackingNumber !== 'string'
  ) {
    return NextResponse.json({ error: '追跡番号は文字列で指定してください' }, { status: 400 });
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
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    if (err instanceof InvalidShipmentInputError || err instanceof InvalidShipmentOperationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const normalizedError = normalizeHttpError(err, '発送完了の記録に失敗しました');
    console.error('発送完了更新エラー:', normalizedError);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

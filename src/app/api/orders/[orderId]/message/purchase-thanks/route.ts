import { NextResponse } from 'next/server';
import {
  PurchaseThanksOrderNotFoundError,
  PurchaseThanksTemplateNotFoundError,
} from '@/application/usecases/GeneratePurchaseThanksUseCase';
import { createContainer } from '@/infrastructure/di/container';
import {
  NotFoundError,
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';

export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;

  if (orderId.trim().length === 0) {
    const error = new ValidationError('orderId は必須です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    const container = createContainer();
    const useCase = container.getGeneratePurchaseThanksUseCase();
    const result = await useCase.execute({ orderId: orderId.trim() });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PurchaseThanksOrderNotFoundError) {
      const error = new NotFoundError(err.message);
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }

    if (err instanceof PurchaseThanksTemplateNotFoundError) {
      const error = new NotFoundError(err.message);
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }

    const normalizedError = normalizeHttpError(err, '購入お礼メッセージの生成に失敗しました');
    console.error('購入お礼メッセージ生成エラー:', err);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

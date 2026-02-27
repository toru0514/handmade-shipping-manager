import { NextResponse } from 'next/server';
import {
  ShippingNoticeOrderNotFoundError,
  ShippingNoticeOrderNotShippedError,
  ShippingNoticeTemplateNotFoundError,
} from '@/application/usecases/GenerateShippingNoticeUseCase';
import { createContainer } from '@/infrastructure/di/container';
import {
  NotFoundError,
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;

  if (orderId.trim().length === 0) {
    const error = new ValidationError('orderId は必須です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  const body = (await request.json().catch(() => ({}))) as { templateContent?: string };

  try {
    const container = createContainer();
    const useCase = container.getGenerateShippingNoticeUseCase();
    const result = await useCase.execute({
      orderId: orderId.trim(),
      templateContent: body.templateContent,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ShippingNoticeOrderNotFoundError) {
      const error = new NotFoundError(err.message);
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }

    if (err instanceof ShippingNoticeTemplateNotFoundError) {
      const error = new NotFoundError(err.message);
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }

    if (err instanceof ShippingNoticeOrderNotShippedError) {
      const error = new ValidationError(err.message);
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }

    const normalizedError = normalizeHttpError(err, '発送連絡メッセージの生成に失敗しました');
    console.error('発送連絡メッセージ生成エラー:', err);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

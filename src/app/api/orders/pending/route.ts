import { NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';
import { normalizeHttpError, toApiErrorResponse } from '@/infrastructure/errors/HttpErrors';

export async function GET() {
  try {
    const container = createContainer();
    const useCase = container.getListPendingOrdersUseCase();
    const orders = await useCase.execute();
    return NextResponse.json(orders);
  } catch (err) {
    const normalizedError = normalizeHttpError(err, '注文の取得に失敗しました');
    console.error('注文取得エラー:', normalizedError);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

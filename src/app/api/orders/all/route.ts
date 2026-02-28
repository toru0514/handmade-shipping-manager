import { NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';
import { normalizeHttpError, toApiErrorResponse } from '@/infrastructure/errors/HttpErrors';

export async function GET() {
  try {
    const container = createContainer();
    const useCase = container.getListAllOrdersUseCase();
    const orders = await useCase.execute();
    return NextResponse.json(orders);
  } catch (err) {
    const normalizedError = normalizeHttpError(err, '注文一覧の取得に失敗しました');
    console.error('注文一覧取得エラー:', err);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

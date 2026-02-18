import { NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';

export async function GET() {
  try {
    const container = createContainer();
    const useCase = container.getListPendingOrdersUseCase();
    const orders = await useCase.execute();
    return NextResponse.json(orders);
  } catch (err) {
    console.error('注文取得エラー:', err);
    return NextResponse.json({ error: '注文の取得に失敗しました' }, { status: 500 });
  }
}

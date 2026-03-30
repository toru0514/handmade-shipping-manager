import { NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';

export async function GET() {
  try {
    const container = createContainer();
    const useCase = container.getListAllOrdersUseCase();
    const orders = await useCase.execute();

    // スプシの注文数をハッシュ的に返す（変更検知用）
    const shippedCount = orders.filter((o) => o.status === 'shipped').length;
    const pendingCount = orders.filter((o) => o.status === 'pending').length;

    return NextResponse.json({
      totalCount: orders.length,
      shippedCount,
      pendingCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

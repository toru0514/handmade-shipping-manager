import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('name')?.trim() ?? '';
  if (keyword.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const container = createContainer();
    const useCase = container.getSearchBuyersUseCase();
    const buyers = await useCase.execute({ buyerName: keyword });
    return NextResponse.json(buyers);
  } catch (err) {
    console.error('購入者検索エラー:', err);
    return NextResponse.json({ error: '購入者情報の検索に失敗しました' }, { status: 500 });
  }
}

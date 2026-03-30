import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const container = createContainer();
    const useCase = container.getSyncOrdersToDbUseCase();
    const result = await useCase.execute();

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';

export async function POST() {
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

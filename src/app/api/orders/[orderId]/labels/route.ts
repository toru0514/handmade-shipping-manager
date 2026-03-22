import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseShippingLabelJobRepository } from '@/infrastructure/adapters/persistence/SupabaseShippingLabelJobRepository';
import {
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';

function createJobRepository(): SupabaseShippingLabelJobRepository {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase 設定が不足しています');
  }
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return new SupabaseShippingLabelJobRepository(supabase);
}

let jobRepositoryFactory = createJobRepository;

export function setJobRepositoryFactoryForTest(factory: typeof createJobRepository): void {
  jobRepositoryFactory = factory;
}

export function resetJobRepositoryFactoryForTest(): void {
  jobRepositoryFactory = createJobRepository;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const error = new ValidationError('リクエストボディが不正です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  if (typeof body !== 'object' || body === null) {
    const error = new ValidationError('リクエストボディが不正です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  const parsedBody = body as Record<string, unknown>;
  const shippingMethod = parsedBody.shippingMethod;
  if (typeof shippingMethod !== 'string' || shippingMethod.trim().length === 0) {
    const error = new ValidationError('配送方法は必須です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    const repository = jobRepositoryFactory();
    const job = await repository.enqueue({
      orderId,
      shippingMethod: shippingMethod.trim(),
    });

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        orderId: job.orderId,
        shippingMethod: job.shippingMethod,
        createdAt: job.createdAt.toISOString(),
      },
      { status: 202 },
    );
  } catch (error) {
    const normalizedError = normalizeHttpError(error, 'ジョブの登録に失敗しました');
    console.error('伝票発行ジョブ登録エラー:', error);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

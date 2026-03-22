import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseShippingLabelJobRepository } from '@/infrastructure/adapters/persistence/SupabaseShippingLabelJobRepository';
import {
  NotFoundError,
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

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;

  try {
    const repository = jobRepositoryFactory();
    const job = await repository.findById(jobId);

    if (!job) {
      const error = new NotFoundError('ジョブが見つかりません');
      return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
    }

    return NextResponse.json(job);
  } catch (error) {
    const normalizedError = normalizeHttpError(error, 'ジョブの取得に失敗しました');
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

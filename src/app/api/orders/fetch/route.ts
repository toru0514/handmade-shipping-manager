import { NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';
import {
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSlackWebhookUrlForUser } from '@/infrastructure/lib/notifications';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform')?.trim() ?? '';

  if (platform.length === 0) {
    const error = new ValidationError('platform は必須です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  if (platform !== 'minne' && platform !== 'creema') {
    const error = new ValidationError('platform は minne / creema のみ対応です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    // Resolve user-specific Slack webhook URL
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userWebhookUrl = user ? await getSlackWebhookUrlForUser(user.id) : null;

    const container = createContainer({ slackWebhookUrlOverride: userWebhookUrl ?? undefined });
    const useCase = container.getFetchNewOrdersUseCase(platform as 'minne' | 'creema');
    const result = await useCase.execute({ platform });
    return NextResponse.json(result);
  } catch (err) {
    const normalizedError = normalizeHttpError(err, '新規注文の取得に失敗しました');
    console.error('新規注文取得エラー:', err);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

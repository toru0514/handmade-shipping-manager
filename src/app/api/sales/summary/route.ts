import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/infrastructure/di/container';
import { normalizeHttpError, toApiErrorResponse } from '@/infrastructure/errors/HttpErrors';
import { PlatformValues, type PlatformValue } from '@/domain/valueObjects/Platform';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ?? undefined;
    const endDate = searchParams.get('endDate') ?? undefined;
    const platformParam = searchParams.get('platform') ?? 'all';

    // プラットフォームパラメータの検証
    let platform: PlatformValue | 'all' = 'all';
    if (platformParam !== 'all') {
      if (PlatformValues.includes(platformParam as PlatformValue)) {
        platform = platformParam as PlatformValue;
      } else {
        return NextResponse.json(
          {
            error: `不正なプラットフォームです: ${platformParam}（minne / creema / all のみ対応）`,
          },
          { status: 400 },
        );
      }
    }

    const container = createContainer();
    const useCase = container.getSalesSummaryUseCase();
    const summary = await useCase.execute({ startDate, endDate, platform });

    return NextResponse.json(summary);
  } catch (err) {
    const normalizedError = normalizeHttpError(err, '売上集計の取得に失敗しました');
    console.error('売上集計取得エラー:', err);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

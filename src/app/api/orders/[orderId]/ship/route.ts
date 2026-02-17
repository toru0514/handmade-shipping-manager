import { NextRequest, NextResponse } from 'next/server';
import { MarkOrderAsShippedUseCase } from '@/application/usecases/MarkOrderAsShippedUseCase';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { GoogleSheetsClient } from '@/infrastructure/external/google/SheetsClient';

interface MarkAsShippedRequestBody {
  shippingMethod?: string;
  trackingNumber?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  let body: MarkAsShippedRequestBody;
  try {
    body = (await request.json()) as MarkAsShippedRequestBody;
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  if (!body.shippingMethod) {
    return NextResponse.json({ error: '配送方法は必須です' }, { status: 400 });
  }

  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN ?? '';
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '';
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? 'Orders';

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName,
    accessToken,
  });

  const repository = new SpreadsheetOrderRepository(sheetsClient);
  const useCase = new MarkOrderAsShippedUseCase(repository);

  try {
    const result = await useCase.execute({
      orderId,
      shippingMethod: body.shippingMethod,
      trackingNumber: body.trackingNumber,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '発送完了の記録に失敗しました';

    if (message.includes('見つかりません')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (
      message.includes('不正な配送方法です') ||
      message.includes('追跡番号は空にできません') ||
      message.includes('発送済みの注文は変更できません')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('発送完了更新エラー:', err);
    return NextResponse.json({ error: '発送完了の記録に失敗しました' }, { status: 500 });
  }
}

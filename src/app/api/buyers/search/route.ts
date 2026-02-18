import { NextRequest, NextResponse } from 'next/server';
import { SearchBuyersUseCase } from '@/application/usecases/SearchBuyersUseCase';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { GoogleSheetsClient } from '@/infrastructure/external/google/SheetsClient';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('name')?.trim() ?? '';
  if (keyword.length === 0) {
    return NextResponse.json([]);
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
  const useCase = new SearchBuyersUseCase(repository);

  try {
    const buyers = await useCase.execute({ buyerName: keyword });
    return NextResponse.json(buyers);
  } catch (err) {
    console.error('購入者検索エラー:', err);
    return NextResponse.json({ error: '購入者情報の検索に失敗しました' }, { status: 500 });
  }
}

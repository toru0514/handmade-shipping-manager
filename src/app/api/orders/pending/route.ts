import { NextResponse } from 'next/server';
import { ListPendingOrdersUseCase } from '@/application/usecases/ListPendingOrdersUseCase';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { GoogleSheetsClient } from '@/infrastructure/external/google/SheetsClient';

export async function GET() {
  const accessToken = process.env.GOOGLE_SHEETS_ACCESS_TOKEN ?? '';
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '';
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? 'Orders';

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName,
    accessToken,
  });

  const repository = new SpreadsheetOrderRepository(sheetsClient);
  const overdueSpec = new OverdueOrderSpecification();
  const useCase = new ListPendingOrdersUseCase(repository, overdueSpec);

  try {
    const orders = await useCase.execute();
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: '注文の取得に失敗しました' }, { status: 500 });
  }
}

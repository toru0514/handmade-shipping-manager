import { NextResponse } from 'next/server';
import { ListPendingOrdersUseCase } from '@/application/usecases/ListPendingOrdersUseCase';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { normalizeHttpError, toApiErrorResponse } from '@/infrastructure/errors/HttpErrors';
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
  } catch (err) {
    const normalizedError = normalizeHttpError(err, '注文の取得に失敗しました');
    console.error('注文取得エラー:', normalizedError);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

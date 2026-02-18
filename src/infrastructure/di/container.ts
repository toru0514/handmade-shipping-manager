import { ListPendingOrdersUseCase } from '@/application/usecases/ListPendingOrdersUseCase';
import { MarkOrderAsShippedUseCase } from '@/application/usecases/MarkOrderAsShippedUseCase';
import { SearchBuyersUseCase } from '@/application/usecases/SearchBuyersUseCase';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { GoogleSheetsClient } from '@/infrastructure/external/google/SheetsClient';

type Env = Readonly<Record<string, string | undefined>>;
type SheetsEnvKey =
  | 'GOOGLE_SHEETS_ACCESS_TOKEN'
  | 'GOOGLE_SHEETS_SPREADSHEET_ID'
  | 'GOOGLE_SHEETS_SHEET_NAME';

function resolveRequiredEnv(name: SheetsEnvKey, env: Env): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function createOrderRepository(env: Env): SpreadsheetOrderRepository {
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: resolveRequiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID', env),
    sheetName: env.GOOGLE_SHEETS_SHEET_NAME?.trim() || 'Orders',
    accessToken: resolveRequiredEnv('GOOGLE_SHEETS_ACCESS_TOKEN', env),
  });

  return new SpreadsheetOrderRepository(sheetsClient);
}

export interface Container {
  getListPendingOrdersUseCase(): ListPendingOrdersUseCase;
  getMarkOrderAsShippedUseCase(): MarkOrderAsShippedUseCase;
  getSearchBuyersUseCase(): SearchBuyersUseCase;
}

export function createContainer(env: Env = process.env): Container {
  const orderRepository = createOrderRepository(env);
  const overdueSpec = new OverdueOrderSpecification();

  return {
    getListPendingOrdersUseCase: () => new ListPendingOrdersUseCase(orderRepository, overdueSpec),
    getMarkOrderAsShippedUseCase: () => new MarkOrderAsShippedUseCase(orderRepository),
    getSearchBuyersUseCase: () => new SearchBuyersUseCase(orderRepository),
  };
}

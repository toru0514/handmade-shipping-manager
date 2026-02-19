import { GeneratePurchaseThanksUseCase } from '@/application/usecases/GeneratePurchaseThanksUseCase';
import { GenerateShippingNoticeUseCase } from '@/application/usecases/GenerateShippingNoticeUseCase';
import { ListPendingOrdersUseCase } from '@/application/usecases/ListPendingOrdersUseCase';
import { MarkOrderAsShippedUseCase } from '@/application/usecases/MarkOrderAsShippedUseCase';
import { SearchBuyersUseCase } from '@/application/usecases/SearchBuyersUseCase';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { DefaultMessageTemplateRepository } from '@/infrastructure/adapters/persistence/DefaultMessageTemplateRepository';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import {
  GoogleSheetsClient,
  type ServiceAccountKey,
} from '@/infrastructure/external/google/SheetsClient';

type Env = Readonly<Record<string, string | undefined>>;
type RequiredEnvKey = 'GOOGLE_SHEETS_SPREADSHEET_ID';

function resolveRequiredEnv(name: RequiredEnvKey, env: Env): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function parseServiceAccountKey(json: string): ServiceAccountKey {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY の JSON パースに失敗しました');
  }

  if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY に client_email と private_key が含まれていません');
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

function createOrderRepository(env: Env): SpreadsheetOrderRepository {
  const serviceAccountKeyJson = env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  const accessToken = env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  const refreshToken = env.GOOGLE_SHEETS_REFRESH_TOKEN?.trim();
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  const serviceAccountKey = serviceAccountKeyJson
    ? parseServiceAccountKey(serviceAccountKeyJson)
    : undefined;

  const hasServiceAccountKey = Boolean(serviceAccountKey);
  const hasAccessToken = Boolean(accessToken);
  const hasRefreshToken = Boolean(refreshToken);
  const hasClientId = Boolean(clientId);
  const hasClientSecret = Boolean(clientSecret);

  if (hasRefreshToken && (!hasClientId || !hasClientSecret)) {
    throw new Error(
      'GOOGLE_SHEETS_REFRESH_TOKEN が設定されている場合は GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET も必須です',
    );
  }

  const hasRefreshTokenConfig = Boolean(refreshToken && clientId && clientSecret);

  if (!hasServiceAccountKey && !hasAccessToken && !hasRefreshTokenConfig) {
    throw new Error(
      'Google Sheets 認証情報が不足しています: GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEETS_ACCESS_TOKEN, または GOOGLE_SHEETS_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET を設定してください',
    );
  }

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: resolveRequiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID', env),
    sheetName: env.GOOGLE_SHEETS_SHEET_NAME?.trim() || 'Orders',
    serviceAccountKey,
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
  });

  return new SpreadsheetOrderRepository(sheetsClient);
}

export interface Container {
  getListPendingOrdersUseCase(): ListPendingOrdersUseCase;
  getMarkOrderAsShippedUseCase(): MarkOrderAsShippedUseCase;
  getSearchBuyersUseCase(): SearchBuyersUseCase;
  getGeneratePurchaseThanksUseCase(): GeneratePurchaseThanksUseCase;
  getGenerateShippingNoticeUseCase(): GenerateShippingNoticeUseCase;
}

export function createContainer(env: Env = process.env): Container {
  const orderRepository = createOrderRepository(env);
  const overdueSpec = new OverdueOrderSpecification();
  const templateRepository = new DefaultMessageTemplateRepository();

  return {
    getListPendingOrdersUseCase: () => new ListPendingOrdersUseCase(orderRepository, overdueSpec),
    getMarkOrderAsShippedUseCase: () => new MarkOrderAsShippedUseCase(orderRepository),
    getSearchBuyersUseCase: () => new SearchBuyersUseCase(orderRepository),
    getGeneratePurchaseThanksUseCase: () =>
      new GeneratePurchaseThanksUseCase(orderRepository, templateRepository),
    getGenerateShippingNoticeUseCase: () =>
      new GenerateShippingNoticeUseCase(orderRepository, templateRepository),
  };
}

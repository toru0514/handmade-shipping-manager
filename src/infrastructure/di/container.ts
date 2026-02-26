import { FetchNewOrdersUseCase } from '@/application/usecases/FetchNewOrdersUseCase';
import { GeneratePurchaseThanksUseCase } from '@/application/usecases/GeneratePurchaseThanksUseCase';
import { GenerateShippingNoticeUseCase } from '@/application/usecases/GenerateShippingNoticeUseCase';
import { IssueShippingLabelUseCase } from '@/application/usecases/IssueShippingLabelUseCase';
import { ListPendingOrdersUseCase } from '@/application/usecases/ListPendingOrdersUseCase';
import { MarkOrderAsShippedUseCase } from '@/application/usecases/MarkOrderAsShippedUseCase';
import { SearchBuyersUseCase } from '@/application/usecases/SearchBuyersUseCase';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { DefaultMessageTemplateRepository } from '@/infrastructure/adapters/persistence/DefaultMessageTemplateRepository';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { SpreadsheetShippingLabelRepository } from '@/infrastructure/adapters/persistence/SpreadsheetShippingLabelRepository';
import { ClickPostAdapter } from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type { ClickPostGateway } from '@/infrastructure/adapters/shipping/ClickPostGateway';
import { ShippingLabelIssuerImpl } from '@/infrastructure/adapters/shipping/ShippingLabelIssuerImpl';
import { YamatoCompactAdapter } from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';
import type { YamatoCompactGateway } from '@/infrastructure/adapters/shipping/YamatoCompactGateway';
import { MinneAdapter } from '@/infrastructure/adapters/platform/MinneAdapter';
import { MinneEmailOrderSource } from '@/infrastructure/adapters/platform/MinneEmailOrderSource';
import { ExternalServiceError } from '@/infrastructure/errors/HttpErrors';
import { GoogleGmailClient } from '@/infrastructure/external/google/GmailClient';
import { ChromiumBrowserFactory } from '@/infrastructure/external/playwright/ChromiumBrowserFactory';
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
    throw new Error('GOOGLE_SERVICE_ACCOUNT_BASE64 のデコードまたは JSON パースに失敗しました');
  }

  if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_BASE64 をデコードした JSON に client_email と private_key が含まれていません',
    );
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

function createOrderRepository(env: Env): SpreadsheetOrderRepository {
  const auth = createAuth(env);
  const spreadsheetId = resolveRequiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID', env);
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: env.GOOGLE_SHEETS_SHEET_NAME?.trim() || 'Orders',
    ...auth,
  });

  return new SpreadsheetOrderRepository(sheetsClient);
}

function createAuth(env: Env) {
  const serviceAccountBase64 = env.GOOGLE_SERVICE_ACCOUNT_BASE64?.trim();
  const accessToken = env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  const refreshToken = env.GOOGLE_SHEETS_REFRESH_TOKEN?.trim();
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  const serviceAccountKey = serviceAccountBase64
    ? parseServiceAccountKey(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'))
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
      'Google Sheets 認証情報が不足しています: GOOGLE_SERVICE_ACCOUNT_BASE64, GOOGLE_SHEETS_ACCESS_TOKEN, または GOOGLE_SHEETS_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET を設定してください',
    );
  }

  return {
    serviceAccountKey,
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
  };
}

function resolvePlaywrightHeadless(env: Env): boolean {
  const value = env.PLAYWRIGHT_HEADLESS?.trim().toLowerCase();
  if (!value) {
    return true;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  throw new Error('PLAYWRIGHT_HEADLESS は true/false（または 1/0）で指定してください');
}

function resolvePlaywrightTimeoutMs(env: Env): number | undefined {
  const value = env.PLAYWRIGHT_LAUNCH_TIMEOUT_MS?.trim();
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('PLAYWRIGHT_LAUNCH_TIMEOUT_MS は正の数値（ミリ秒）で指定してください');
  }

  return parsed;
}

function resolvePlaywrightIgnoreHTTPSErrors(env: Env): boolean {
  const value = env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS?.trim().toLowerCase();
  if (!value) {
    return false;
  }
  return value === 'true' || value === '1';
}

function resolveManualLoginTimeoutMs(env: Env): number | undefined {
  const value = env.CLICKPOST_MANUAL_LOGIN_TIMEOUT_MS?.trim();
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('CLICKPOST_MANUAL_LOGIN_TIMEOUT_MS は正の数値（ミリ秒）で指定してください');
  }
  return parsed;
}

function createGmailClient(env: Env): GoogleGmailClient {
  const accessToken = env.GMAIL_ACCESS_TOKEN?.trim();
  const refreshToken = env.GMAIL_REFRESH_TOKEN?.trim();
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  if (!accessToken && !refreshToken) {
    throw new Error(
      'Gmail 認証情報が不足しています: GMAIL_ACCESS_TOKEN または GMAIL_REFRESH_TOKEN を設定してください',
    );
  }
  if (refreshToken && (!clientId || !clientSecret)) {
    throw new Error(
      'GMAIL_REFRESH_TOKEN が設定されている場合は GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET も必須です',
    );
  }

  return new GoogleGmailClient({ accessToken, refreshToken, clientId, clientSecret });
}

function createFetchNewOrdersUseCase(
  env: Env,
  orderRepository: ReturnType<typeof createOrderRepository>,
): FetchNewOrdersUseCase {
  const gmailClient = createGmailClient(env);
  const emailOrderSource = new MinneEmailOrderSource(gmailClient);

  const minneEmail = env.MINNE_EMAIL?.trim();
  if (!minneEmail) {
    throw new Error('MINNE_EMAIL が設定されていません');
  }

  const browserFactory = new ChromiumBrowserFactory({
    headless: resolvePlaywrightHeadless(env),
    timeoutMs: resolvePlaywrightTimeoutMs(env),
    ignoreHTTPSErrors: resolvePlaywrightIgnoreHTTPSErrors(env),
  });

  const orderFetcher = new MinneAdapter({
    browserFactory,
    email: minneEmail,
    getLoginUrl: async () => {
      return gmailClient.fetchMinneMagicLink(new Date(), {
        timeoutMs: 120_000,
        intervalMs: 5_000,
      });
    },
  });

  return new FetchNewOrdersUseCase(emailOrderSource, orderFetcher, orderRepository);
}

function createIssueShippingLabelUseCase(env: Env): IssueShippingLabelUseCase {
  let auth: ReturnType<typeof createAuth>;
  let spreadsheetId: string;
  let browserFactory: ChromiumBrowserFactory;
  try {
    auth = createAuth(env);
    spreadsheetId = resolveRequiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID', env);
    browserFactory = new ChromiumBrowserFactory({
      headless: resolvePlaywrightHeadless(env),
      timeoutMs: resolvePlaywrightTimeoutMs(env),
      ignoreHTTPSErrors: resolvePlaywrightIgnoreHTTPSErrors(env),
    });
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError(message);
  }

  const clickPostGateway: ClickPostGateway = {
    issue: async (order) => {
      // 配送方法ごとに必要な認証情報だけを検証する。
      const manualLogin = env.CLICKPOST_MANUAL_LOGIN?.trim().toLowerCase() === 'true';
      const clickPostEmail = env.CLICKPOST_EMAIL?.trim();
      const clickPostPassword = env.CLICKPOST_PASSWORD?.trim();
      if (!manualLogin && (!clickPostEmail || !clickPostPassword)) {
        throw new ExternalServiceError('CLICKPOST_EMAIL / CLICKPOST_PASSWORD が設定されていません');
      }

      const dryRun = env.CLICKPOST_DRY_RUN?.trim().toLowerCase() === 'true';
      let manualLoginTimeoutMs: number | undefined;
      try {
        manualLoginTimeoutMs = resolveManualLoginTimeoutMs(env);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new ExternalServiceError(message);
      }
      const adapter = new ClickPostAdapter({
        browserFactory,
        credentials: {
          email: clickPostEmail ?? '',
          password: clickPostPassword ?? '',
        },
        manualLogin,
        manualLoginTimeoutMs,
        keepBrowserOpenOnError:
          env.CLICKPOST_KEEP_BROWSER_OPEN_ON_ERROR?.trim().toLowerCase() === 'true',
        dryRun,
      });

      return adapter.issue(order);
    },
  };

  const yamatoGateway: YamatoCompactGateway = {
    issue: async (order) => {
      const memberId = env.YAMATO_MEMBER_ID?.trim();
      const password = env.YAMATO_PASSWORD?.trim();
      if (!memberId || !password) {
        throw new ExternalServiceError('YAMATO_MEMBER_ID / YAMATO_PASSWORD が設定されていません');
      }

      const adapter = new YamatoCompactAdapter({
        browserFactory,
        credentials: {
          memberId,
          password,
        },
      });

      return adapter.issue(order);
    },
  };

  const orderSheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: env.GOOGLE_SHEETS_SHEET_NAME?.trim() || 'Orders',
    ...auth,
  });
  const labelSheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: env.GOOGLE_SHEETS_LABEL_SHEET_NAME?.trim() || 'ShippingLabels',
    ...auth,
  });

  const issuer = new ShippingLabelIssuerImpl(clickPostGateway, yamatoGateway);
  return new IssueShippingLabelUseCase(
    new SpreadsheetOrderRepository(orderSheetsClient),
    new SpreadsheetShippingLabelRepository(labelSheetsClient),
    issuer,
  );
}

export interface Container {
  getListPendingOrdersUseCase(): ListPendingOrdersUseCase;
  getMarkOrderAsShippedUseCase(): MarkOrderAsShippedUseCase;
  getSearchBuyersUseCase(): SearchBuyersUseCase;
  getGeneratePurchaseThanksUseCase(): GeneratePurchaseThanksUseCase;
  getGenerateShippingNoticeUseCase(): GenerateShippingNoticeUseCase;
  getIssueShippingLabelUseCase(): IssueShippingLabelUseCase;
  getFetchNewOrdersUseCase(): FetchNewOrdersUseCase;
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
    getIssueShippingLabelUseCase: () => createIssueShippingLabelUseCase(env),
    getFetchNewOrdersUseCase: () => createFetchNewOrdersUseCase(env, orderRepository),
  };
}

import { FetchNewOrdersUseCase } from '@/application/usecases/FetchNewOrdersUseCase';
import { GeneratePurchaseThanksUseCase } from '@/application/usecases/GeneratePurchaseThanksUseCase';
import { GetSalesSummaryUseCase } from '@/application/usecases/GetSalesSummaryUseCase';
import { ListAllOrdersUseCase } from '@/application/usecases/ListAllOrdersUseCase';
import { GenerateShippingNoticeUseCase } from '@/application/usecases/GenerateShippingNoticeUseCase';
import { IssueShippingLabelUseCase } from '@/application/usecases/IssueShippingLabelUseCase';
import { ListPendingOrdersUseCase } from '@/application/usecases/ListPendingOrdersUseCase';
import { MarkOrderAsShippedUseCase } from '@/application/usecases/MarkOrderAsShippedUseCase';
import { RestoreFromDbUseCase } from '@/application/usecases/RestoreFromDbUseCase';
import { SearchBuyersUseCase } from '@/application/usecases/SearchBuyersUseCase';
import { SyncOrdersToDbUseCase } from '@/application/usecases/SyncOrdersToDbUseCase';
import { UpdateMessageTemplateUseCase } from '@/application/usecases/UpdateMessageTemplateUseCase';
import type { Order } from '@/domain/entities/Order';
import type { ShippingLabel } from '@/domain/entities/ShippingLabel';
import type { OrderRepository } from '@/domain/ports/OrderRepository';
import type { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { MessageGenerator } from '@/domain/services/MessageGenerator';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { DualWriteMessageTemplateRepository } from '@/infrastructure/adapters/persistence/DualWriteMessageTemplateRepository';
import { DualWriteOrderRepository } from '@/infrastructure/adapters/persistence/DualWriteOrderRepository';
import { DualWriteShippingLabelRepository } from '@/infrastructure/adapters/persistence/DualWriteShippingLabelRepository';
import { SpreadsheetMessageTemplateRepository } from '@/infrastructure/adapters/persistence/SpreadsheetMessageTemplateRepository';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { SpreadsheetProductNameResolver } from '@/infrastructure/adapters/persistence/SpreadsheetProductNameResolver';
import { DualWriteProductNameResolver } from '@/infrastructure/adapters/persistence/DualWriteProductNameResolver';
import { SpreadsheetShippingMethodLabelResolver } from '@/infrastructure/adapters/persistence/SpreadsheetShippingMethodLabelResolver';
import { SpreadsheetShippingLabelRepository } from '@/infrastructure/adapters/persistence/SpreadsheetShippingLabelRepository';
import { SupabaseMessageTemplateRepository } from '@/infrastructure/adapters/persistence/SupabaseMessageTemplateRepository';
import { SupabaseOrderRepository } from '@/infrastructure/adapters/persistence/SupabaseOrderRepository';
import { SupabaseOrderSyncRepository } from '@/infrastructure/adapters/persistence/SupabaseOrderSyncRepository';
import { SupabaseShippingLabelRepository } from '@/infrastructure/adapters/persistence/SupabaseShippingLabelRepository';
import { ClickPostAdapter } from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type { ClickPostGateway } from '@/infrastructure/adapters/shipping/ClickPostGateway';
import { ShippingLabelIssuerImpl } from '@/infrastructure/adapters/shipping/ShippingLabelIssuerImpl';
import { YamatoCompactAdapter } from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';
import type { YamatoCompactGateway } from '@/infrastructure/adapters/shipping/YamatoCompactGateway';
import { MinneAdapter } from '@/infrastructure/adapters/platform/MinneAdapter';
import { CreemaAdapter } from '@/infrastructure/adapters/platform/CreemaAdapter';
import { MinneEmailOrderSource } from '@/infrastructure/adapters/platform/MinneEmailOrderSource';
import { CreemaEmailOrderSource } from '@/infrastructure/adapters/platform/CreemaEmailOrderSource';
import { createClient } from '@supabase/supabase-js';
import { SlackAdapter } from '@/infrastructure/adapters/notification/SlackAdapter';
import { ExternalServiceError } from '@/infrastructure/errors/HttpErrors';
import { GoogleGmailClient } from '@/infrastructure/external/google/GmailClient';
import { BrowserlessBrowserFactory } from '@/infrastructure/external/playwright/BrowserlessBrowserFactory';
import { ChromiumBrowserFactory } from '@/infrastructure/external/playwright/ChromiumBrowserFactory';
import {
  GoogleSheetsClient,
  type ServiceAccountKey,
} from '@/infrastructure/external/google/SheetsClient';
import { ConsoleLogger } from '@/infrastructure/logging/Logger';

type Env = Readonly<Record<string, string | undefined>>;
type RequiredEnvKey = 'SHIPPING_SPREADSHEET_ID';

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
  const spreadsheetId = resolveRequiredEnv('SHIPPING_SPREADSHEET_ID', env);
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: env.SHIPPING_ORDERS_SHEET_NAME?.trim() || 'Orders',
    ...auth,
  });

  return new SpreadsheetOrderRepository(sheetsClient);
}

function createTemplateRepository(env: Env): SpreadsheetMessageTemplateRepository {
  const auth = createAuth(env);
  const spreadsheetId = resolveRequiredEnv('SHIPPING_SPREADSHEET_ID', env);
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: env.SHIPPING_TEMPLATES_SHEET_NAME?.trim() || 'Templates',
    ...auth,
  });
  return new SpreadsheetMessageTemplateRepository(sheetsClient);
}

function createProductNameResolver(env: Env): DualWriteProductNameResolver {
  const auth = createAuth(env);
  const spreadsheetId = resolveRequiredEnv('SHIPPING_SPREADSHEET_ID', env);
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: env.SHIPPING_PRODUCT_NAME_MAP_SHEET_NAME?.trim() || 'ProductNameMap',
    ...auth,
  });
  const spreadsheetResolver = new SpreadsheetProductNameResolver(sheetsClient);
  return new DualWriteProductNameResolver(spreadsheetResolver);
}

function createShippingMethodLabelResolver(env: Env): SpreadsheetShippingMethodLabelResolver {
  const auth = createAuth(env);
  const spreadsheetId = resolveRequiredEnv('SHIPPING_SPREADSHEET_ID', env);
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: env.SHIPPING_METHOD_LABEL_SHEET_NAME?.trim() || 'ShippingMethodLabelMap',
    ...auth,
  });
  return new SpreadsheetShippingMethodLabelResolver(sheetsClient);
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

function createBrowserFactory(env: Env): ChromiumBrowserFactory | BrowserlessBrowserFactory {
  const wsEndpoint = env.BROWSERLESS_WS_ENDPOINT?.trim();
  if (wsEndpoint) {
    return new BrowserlessBrowserFactory({
      wsEndpoint,
      ignoreHTTPSErrors: resolvePlaywrightIgnoreHTTPSErrors(env),
    });
  }
  return new ChromiumBrowserFactory({
    headless: resolvePlaywrightHeadless(env),
    timeoutMs: resolvePlaywrightTimeoutMs(env),
    ignoreHTTPSErrors: resolvePlaywrightIgnoreHTTPSErrors(env),
  });
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
  orderRepository: OrderRepository<Order>,
  platform: 'minne' | 'creema',
  slackWebhookUrlOverride?: string,
): FetchNewOrdersUseCase {
  const gmailClient = createGmailClient(env);
  const slackWebhookUrl = slackWebhookUrlOverride ?? env.SLACK_WEBHOOK_URL?.trim();
  const slackAdapter = slackWebhookUrl ? new SlackAdapter(slackWebhookUrl) : undefined;

  const browserFactory = createBrowserFactory(env);

  if (platform === 'creema') {
    const creemaEmail = env.CREEMA_EMAIL?.trim();
    const creemaPassword = env.CREEMA_PASSWORD?.trim();
    if (!creemaEmail || !creemaPassword) {
      throw new Error('CREEMA_EMAIL / CREEMA_PASSWORD が設定されていません');
    }
    const emailOrderSource = new CreemaEmailOrderSource(gmailClient);
    const orderFetcher = new CreemaAdapter({
      browserFactory,
      credentials: {
        email: creemaEmail,
        password: creemaPassword,
      },
    });
    return new FetchNewOrdersUseCase(
      emailOrderSource,
      orderFetcher,
      orderRepository,
      /* orderFactory= */ undefined, // use default OrderFactory
      slackAdapter,
    );
  }

  const minneEmail = env.MINNE_EMAIL?.trim();
  if (!minneEmail) {
    throw new Error('MINNE_EMAIL が設定されていません');
  }
  const emailOrderSource = new MinneEmailOrderSource(gmailClient);
  const orderFetcher = new MinneAdapter({
    browserFactory,
    email: minneEmail,
    getLoginUrl: async ({ sentAfter }) => {
      return gmailClient.fetchMinneMagicLink(sentAfter, {
        timeoutMs: 120_000,
        intervalMs: 5_000,
      });
    },
  });

  return new FetchNewOrdersUseCase(
    emailOrderSource,
    orderFetcher,
    orderRepository,
    undefined,
    slackAdapter,
  );
}

function createIssueShippingLabelUseCase(
  env: Env,
  orderRepo: OrderRepository<Order>,
  labelRepo: ShippingLabelRepository<ShippingLabel>,
): IssueShippingLabelUseCase {
  let browserFactory: ReturnType<typeof createBrowserFactory>;
  try {
    browserFactory = createBrowserFactory(env);
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

  const issuer = new ShippingLabelIssuerImpl(clickPostGateway, yamatoGateway);
  return new IssueShippingLabelUseCase(orderRepo, labelRepo, issuer);
}

export interface Container {
  getListPendingOrdersUseCase(): ListPendingOrdersUseCase;
  getListAllOrdersUseCase(): ListAllOrdersUseCase;
  getMarkOrderAsShippedUseCase(): MarkOrderAsShippedUseCase;
  getSearchBuyersUseCase(): SearchBuyersUseCase;
  getGeneratePurchaseThanksUseCase(): GeneratePurchaseThanksUseCase;
  getGenerateShippingNoticeUseCase(): GenerateShippingNoticeUseCase;
  getIssueShippingLabelUseCase(): IssueShippingLabelUseCase;
  getFetchNewOrdersUseCase(platform: 'minne' | 'creema'): FetchNewOrdersUseCase;
  getUpdateMessageTemplateUseCase(): UpdateMessageTemplateUseCase;
  getSyncOrdersToDbUseCase(): SyncOrdersToDbUseCase;
  getRestoreFromDbUseCase(): RestoreFromDbUseCase;
  getSalesSummaryUseCase(): GetSalesSummaryUseCase;
}

export type ContainerOptions = {
  slackWebhookUrlOverride?: string;
};

export function createContainer(
  envOrOptions: Env | ContainerOptions = process.env,
  maybeOptions?: ContainerOptions,
): Container {
  const env: Env =
    envOrOptions && 'slackWebhookUrlOverride' in envOrOptions ? process.env : envOrOptions;
  const options: ContainerOptions | undefined =
    envOrOptions && 'slackWebhookUrlOverride' in envOrOptions ? envOrOptions : maybeOptions;
  // Supabase client (optional — only created when env vars are set)
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseClient =
    supabaseUrl && supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;
  const logger = new ConsoleLogger();

  // Spreadsheet repos (primary)
  const spreadsheetOrderRepo = createOrderRepository(env);
  const orderRepository: OrderRepository<Order> = supabaseClient
    ? new DualWriteOrderRepository(
        spreadsheetOrderRepo,
        new SupabaseOrderRepository(supabaseClient),
        logger,
      )
    : spreadsheetOrderRepo;

  const auth = createAuth(env);
  const spreadsheetId = resolveRequiredEnv('SHIPPING_SPREADSHEET_ID', env);
  const labelSheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: env.SHIPPING_LABELS_SHEET_NAME?.trim() || 'ShippingLabels',
    ...auth,
  });
  const spreadsheetLabelRepo = new SpreadsheetShippingLabelRepository(labelSheetsClient);
  const shippingLabelRepository: ShippingLabelRepository<ShippingLabel> = supabaseClient
    ? new DualWriteShippingLabelRepository(
        spreadsheetLabelRepo,
        new SupabaseShippingLabelRepository(supabaseClient),
        logger,
      )
    : spreadsheetLabelRepo;

  const spreadsheetTemplateRepo = createTemplateRepository(env);
  const templateRepository = supabaseClient
    ? new DualWriteMessageTemplateRepository(
        spreadsheetTemplateRepo,
        new SupabaseMessageTemplateRepository(supabaseClient),
        logger,
      )
    : spreadsheetTemplateRepo;

  const overdueSpec = new OverdueOrderSpecification();
  const productNameResolver = createProductNameResolver(env);
  const shippingMethodLabelResolver = createShippingMethodLabelResolver(env);

  return {
    getListPendingOrdersUseCase: () =>
      new ListPendingOrdersUseCase(orderRepository, overdueSpec, productNameResolver),
    getListAllOrdersUseCase: () => new ListAllOrdersUseCase(orderRepository),
    getMarkOrderAsShippedUseCase: () => new MarkOrderAsShippedUseCase(orderRepository),
    getSearchBuyersUseCase: () => new SearchBuyersUseCase(orderRepository),
    getGeneratePurchaseThanksUseCase: () =>
      new GeneratePurchaseThanksUseCase(
        orderRepository,
        templateRepository,
        new MessageGenerator(),
        productNameResolver,
      ),
    getGenerateShippingNoticeUseCase: () =>
      new GenerateShippingNoticeUseCase(
        orderRepository,
        templateRepository,
        new MessageGenerator(),
        shippingMethodLabelResolver,
      ),
    getIssueShippingLabelUseCase: () =>
      createIssueShippingLabelUseCase(env, orderRepository, shippingLabelRepository),
    getFetchNewOrdersUseCase: (platform: 'minne' | 'creema') =>
      createFetchNewOrdersUseCase(env, orderRepository, platform, options?.slackWebhookUrlOverride),
    getUpdateMessageTemplateUseCase: () => new UpdateMessageTemplateUseCase(templateRepository),
    getSyncOrdersToDbUseCase: () => {
      if (!supabaseClient) {
        throw new Error(
          'Supabase 設定が不足しています: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください',
        );
      }

      const syncRepository = new SupabaseOrderSyncRepository(supabaseClient);
      return new SyncOrdersToDbUseCase(orderRepository, shippingLabelRepository, syncRepository);
    },
    getRestoreFromDbUseCase: () => {
      if (!supabaseClient) {
        throw new Error('Supabase 設定が不足しています: 復元にはDBが必要です');
      }
      return new RestoreFromDbUseCase(
        new SupabaseOrderRepository(supabaseClient),
        spreadsheetOrderRepo,
        new SupabaseShippingLabelRepository(supabaseClient),
        spreadsheetLabelRepo,
        new SupabaseMessageTemplateRepository(supabaseClient),
        spreadsheetTemplateRepo,
      );
    },
    getSalesSummaryUseCase: () => new GetSalesSummaryUseCase(orderRepository, productNameResolver),
  };
}

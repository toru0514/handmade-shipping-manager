import { NextRequest, NextResponse } from 'next/server';
import { IssueShippingLabelUseCase } from '@/application/usecases/IssueShippingLabelUseCase';
import {
  InvalidLabelIssueInputError,
  InvalidLabelIssueOperationError,
  OrderNotFoundError,
} from '@/application/usecases/IssueShippingLabelErrors';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { SpreadsheetShippingLabelRepository } from '@/infrastructure/adapters/persistence/SpreadsheetShippingLabelRepository';
import {
  ClickPostAdapter,
  ClickPostDryRunCompletedError,
} from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type { ClickPostGateway } from '@/infrastructure/adapters/shipping/ClickPostGateway';
import { ShippingLabelIssuerImpl } from '@/infrastructure/adapters/shipping/ShippingLabelIssuerImpl';
import { YamatoCompactAdapter } from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';
import type { YamatoCompactGateway } from '@/infrastructure/adapters/shipping/YamatoCompactGateway';
import {
  ExternalServiceError,
  NotFoundError,
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';
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

export function parseServiceAccountKeyFromBase64(base64: string): ServiceAccountKey {
  let parsed: Record<string, unknown>;
  try {
    const json = Buffer.from(base64, 'base64').toString('utf8');
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

function createAuth(env: Env) {
  const serviceAccountBase64 = env.GOOGLE_SERVICE_ACCOUNT_BASE64?.trim();
  const accessToken = env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  const refreshToken = env.GOOGLE_SHEETS_REFRESH_TOKEN?.trim();
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const serviceAccountKey = serviceAccountBase64
    ? parseServiceAccountKeyFromBase64(serviceAccountBase64)
    : undefined;

  const hasServiceAccountKey = Boolean(serviceAccountKey);
  const hasRefreshToken = Boolean(refreshToken);
  const hasClientId = Boolean(clientId);
  const hasClientSecret = Boolean(clientSecret);

  if (hasRefreshToken && (!hasClientId || !hasClientSecret)) {
    throw new Error(
      'GOOGLE_SHEETS_REFRESH_TOKEN が設定されている場合は GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET も必須です',
    );
  }

  const hasRefreshTokenConfig = Boolean(refreshToken && clientId && clientSecret);
  if (!hasServiceAccountKey && !accessToken && !hasRefreshTokenConfig) {
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

export async function createIssueShippingLabelUseCase(
  env: Env = process.env,
): Promise<IssueShippingLabelUseCase> {
  const auth = createAuth(env);
  const spreadsheetId = resolveRequiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID', env);
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

  let browserFactory: ChromiumBrowserFactory;
  try {
    browserFactory = new ChromiumBrowserFactory({
      headless: resolvePlaywrightHeadless(env),
      timeoutMs: resolvePlaywrightTimeoutMs(env),
      ignoreHTTPSErrors: resolvePlaywrightIgnoreHTTPSErrors(env),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError(`Playwright 初期化に失敗しました: ${message}`);
  }

  const clickPostGateway: ClickPostGateway = {
    issue: async (order) => {
      // 配送方法ごとに必要な認証情報だけを検証する。
      // これにより、yamato_compact 発行時に CLICKPOST_* 未設定でも失敗しない。
      const manualLogin = env.CLICKPOST_MANUAL_LOGIN?.trim().toLowerCase() === 'true';
      const clickPostEmail = env.CLICKPOST_EMAIL?.trim();
      const clickPostPassword = env.CLICKPOST_PASSWORD?.trim();
      if (!manualLogin && (!clickPostEmail || !clickPostPassword)) {
        throw new ExternalServiceError('CLICKPOST_EMAIL / CLICKPOST_PASSWORD が設定されていません');
      }

      const dryRun = env.CLICKPOST_DRY_RUN?.trim().toLowerCase() === 'true';
      const adapter = new ClickPostAdapter({
        browserFactory,
        credentials: {
          email: clickPostEmail ?? '',
          password: clickPostPassword ?? '',
        },
        manualLogin,
        manualLoginTimeoutMs: resolveManualLoginTimeoutMs(env),
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

  return new IssueShippingLabelUseCase(
    new SpreadsheetOrderRepository(orderSheetsClient),
    new SpreadsheetShippingLabelRepository(labelSheetsClient),
    issuer,
  );
}

let issueShippingLabelUseCaseFactory = createIssueShippingLabelUseCase;

export function setIssueShippingLabelUseCaseFactoryForTest(
  factory: typeof createIssueShippingLabelUseCase,
): void {
  issueShippingLabelUseCaseFactory = factory;
}

export function resetIssueShippingLabelUseCaseFactoryForTest(): void {
  issueShippingLabelUseCaseFactory = createIssueShippingLabelUseCase;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const error = new ValidationError('リクエストボディが不正です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  if (typeof body !== 'object' || body === null) {
    const error = new ValidationError('リクエストボディが不正です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  const parsedBody = body as Record<string, unknown>;
  const shippingMethod = parsedBody.shippingMethod;
  if (typeof shippingMethod !== 'string' || shippingMethod.trim().length === 0) {
    const error = new ValidationError('配送方法は必須です');
    return NextResponse.json(toApiErrorResponse(error), { status: error.statusCode });
  }

  try {
    const useCase = await issueShippingLabelUseCaseFactory();
    const result = await useCase.execute({
      orderId,
      shippingMethod: shippingMethod.trim(),
    });
    return NextResponse.json(result);
  } catch (error) {
    // ドライラン完了は正常終了（ブラウザで手動支払いを促す）
    if (error instanceof ClickPostDryRunCompletedError) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message:
          'ドライラン完了: 確認画面まで到達しました。ブラウザで支払いを手動で完了してください。',
      });
    }

    if (error instanceof OrderNotFoundError) {
      const httpError = new NotFoundError(error.message);
      return NextResponse.json(toApiErrorResponse(httpError), { status: httpError.statusCode });
    }

    if (
      error instanceof InvalidLabelIssueInputError ||
      error instanceof InvalidLabelIssueOperationError
    ) {
      const httpError = new ValidationError(error.message);
      return NextResponse.json(toApiErrorResponse(httpError), { status: httpError.statusCode });
    }

    const normalizedError = normalizeHttpError(error, '伝票発行に失敗しました');
    console.error('伝票発行エラー:', error);
    return NextResponse.json(toApiErrorResponse(normalizedError), {
      status: normalizedError.statusCode,
    });
  }
}

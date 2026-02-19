import { NextRequest, NextResponse } from 'next/server';
import { IssueShippingLabelUseCase } from '@/application/usecases/IssueShippingLabelUseCase';
import {
  InvalidLabelIssueInputError,
  InvalidLabelIssueOperationError,
  OrderNotFoundError,
} from '@/application/usecases/IssueShippingLabelErrors';
import { SpreadsheetOrderRepository } from '@/infrastructure/adapters/persistence/SpreadsheetOrderRepository';
import { SpreadsheetShippingLabelRepository } from '@/infrastructure/adapters/persistence/SpreadsheetShippingLabelRepository';
import { ClickPostAdapter } from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type { PlaywrightBrowserLike } from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import { ShippingLabelIssuerImpl } from '@/infrastructure/adapters/shipping/ShippingLabelIssuerImpl';
import { YamatoCompactGateway } from '@/infrastructure/adapters/shipping/YamatoCompactGateway';
import {
  ExternalServiceError,
  NotFoundError,
  ValidationError,
  normalizeHttpError,
  toApiErrorResponse,
} from '@/infrastructure/errors/HttpErrors';
import type { PlaywrightPageLike } from '@/infrastructure/external/playwright/ClickPostPage';
import { GoogleSheetsClient } from '@/infrastructure/external/google/SheetsClient';

type Env = Readonly<Record<string, string | undefined>>;
type RequiredEnvKey = 'GOOGLE_SHEETS_SPREADSHEET_ID';

function resolveRequiredEnv(name: RequiredEnvKey, env: Env): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function createAuth(env: Env) {
  const accessToken = env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
  const refreshToken = env.GOOGLE_SHEETS_REFRESH_TOKEN?.trim();
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  const hasRefreshToken = Boolean(refreshToken);
  const hasClientId = Boolean(clientId);
  const hasClientSecret = Boolean(clientSecret);

  if (hasRefreshToken && (!hasClientId || !hasClientSecret)) {
    throw new Error(
      'GOOGLE_SHEETS_REFRESH_TOKEN が設定されている場合は GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET も必須です',
    );
  }

  const hasRefreshTokenConfig = Boolean(refreshToken && clientId && clientSecret);
  if (!accessToken && !hasRefreshTokenConfig) {
    throw new Error(
      'Google Sheets 認証情報が不足しています: GOOGLE_SHEETS_ACCESS_TOKEN または GOOGLE_SHEETS_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET を設定してください',
    );
  }

  return {
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
  };
}

async function loadPlaywrightChromium(): Promise<{
  launch: (options: { headless: boolean }) => Promise<PlaywrightBrowserLike>;
}> {
  const moduleName = process.env.PLAYWRIGHT_MODULE?.trim() || 'playwright';
  try {
    const module = (await import(moduleName)) as {
      chromium?: {
        launch: (options: { headless: boolean }) => Promise<{
          newPage(): Promise<PlaywrightPageLike>;
          close(): Promise<void>;
        }>;
      };
    };

    if (!module.chromium?.launch) {
      throw new Error('chromium launcher が見つかりません');
    }
    return module.chromium;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError(`Playwright 初期化に失敗しました: ${message}`);
  }
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

  const chromium = await loadPlaywrightChromium();
  const clickPostEmail = env.CLICKPOST_EMAIL?.trim();
  const clickPostPassword = env.CLICKPOST_PASSWORD?.trim();
  if (!clickPostEmail || !clickPostPassword) {
    throw new ExternalServiceError('CLICKPOST_EMAIL / CLICKPOST_PASSWORD が設定されていません');
  }
  const clickPostAdapter = new ClickPostAdapter({
    browserFactory: {
      launch: () => chromium.launch({ headless: true }),
    },
    credentials: {
      email: clickPostEmail,
      password: clickPostPassword,
    },
  });

  const unsupportedYamatoGateway: YamatoCompactGateway = {
    issue: async () => {
      throw new ValidationError('yamato_compact は未対応です');
    },
  };

  const issuer = new ShippingLabelIssuerImpl(clickPostAdapter, unsupportedYamatoGateway);

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

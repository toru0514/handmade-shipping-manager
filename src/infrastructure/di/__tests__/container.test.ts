import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';
import { createContainer } from '../container';

const TEST_PRIVATE_KEY = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;

const VALID_SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: 'test@test-project.iam.gserviceaccount.com',
  private_key: TEST_PRIVATE_KEY,
});
const VALID_SERVICE_ACCOUNT_BASE64 = Buffer.from(VALID_SERVICE_ACCOUNT_JSON, 'utf8').toString(
  'base64',
);

function baseEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    GOOGLE_SHEETS_SPREADSHEET_ID: 'test-spreadsheet-id',
    ...overrides,
  };
}

describe('createContainer', () => {
  it('GOOGLE_SERVICE_ACCOUNT_BASE64 で Container を生成できる', () => {
    const env = baseEnv({ GOOGLE_SERVICE_ACCOUNT_BASE64: VALID_SERVICE_ACCOUNT_BASE64 });
    const container = createContainer(env);
    expect(container.getListPendingOrdersUseCase).toBeDefined();
  });

  it('GOOGLE_SHEETS_ACCESS_TOKEN で Container を生成できる', () => {
    const env = baseEnv({ GOOGLE_SHEETS_ACCESS_TOKEN: 'test-token' });
    const container = createContainer(env);
    expect(container.getListPendingOrdersUseCase).toBeDefined();
  });

  it('伝票発行ユースケースを取得できる', () => {
    const env = baseEnv({
      GOOGLE_SHEETS_ACCESS_TOKEN: 'test-token',
      CLICKPOST_EMAIL: 'clickpost@example.com',
      CLICKPOST_PASSWORD: 'password',
      YAMATO_MEMBER_ID: 'member-id',
      YAMATO_PASSWORD: 'password',
    });

    const container = createContainer(env);
    const useCase = container.getIssueShippingLabelUseCase();
    expect(useCase.execute).toBeDefined();
  });

  it('PLAYWRIGHT_HEADLESS が不正値の場合、伝票発行ユースケース取得時にエラー', () => {
    const env = baseEnv({
      GOOGLE_SHEETS_ACCESS_TOKEN: 'test-token',
      PLAYWRIGHT_HEADLESS: 'invalid',
    });
    const container = createContainer(env);
    expect(() => container.getIssueShippingLabelUseCase()).toThrow(
      'PLAYWRIGHT_HEADLESS は true/false（または 1/0）で指定してください',
    );
  });

  it('認証情報がない場合はエラーを投げる', () => {
    const env = baseEnv();
    expect(() => createContainer(env)).toThrow('Google Sheets 認証情報が不足しています');
  });

  it('GOOGLE_SHEETS_SPREADSHEET_ID がない場合はエラーを投げる', () => {
    const env = { GOOGLE_SERVICE_ACCOUNT_BASE64: VALID_SERVICE_ACCOUNT_BASE64 };
    expect(() => createContainer(env)).toThrow('GOOGLE_SHEETS_SPREADSHEET_ID is not configured');
  });

  it('不正な BASE64 の GOOGLE_SERVICE_ACCOUNT_BASE64 はエラーを投げる', () => {
    const env = baseEnv({ GOOGLE_SERVICE_ACCOUNT_BASE64: '!!!' });
    expect(() => createContainer(env)).toThrow('デコードまたは JSON パースに失敗しました');
  });

  it('client_email が欠けた GOOGLE_SERVICE_ACCOUNT_BASE64 はエラーを投げる', () => {
    const env = baseEnv({
      GOOGLE_SERVICE_ACCOUNT_BASE64: Buffer.from(
        JSON.stringify({ private_key: TEST_PRIVATE_KEY }),
        'utf8',
      ).toString('base64'),
    });
    expect(() => createContainer(env)).toThrow('client_email と private_key が含まれていません');
  });

  it('private_key が欠けた GOOGLE_SERVICE_ACCOUNT_BASE64 はエラーを投げる', () => {
    const env = baseEnv({
      GOOGLE_SERVICE_ACCOUNT_BASE64: Buffer.from(
        JSON.stringify({
          client_email: 'test@test.iam.gserviceaccount.com',
        }),
        'utf8',
      ).toString('base64'),
    });
    expect(() => createContainer(env)).toThrow('client_email と private_key が含まれていません');
  });

  it('fetch(minne) ユースケースを取得できる', () => {
    const env = baseEnv({
      GOOGLE_SHEETS_ACCESS_TOKEN: 'test-token',
      GMAIL_ACCESS_TOKEN: 'gmail-token',
      MINNE_EMAIL: 'minne@example.com',
    });
    const container = createContainer(env);
    const useCase = container.getFetchNewOrdersUseCase('minne');
    expect(useCase.execute).toBeDefined();
  });

  it('fetch(creema) ユースケースを取得できる', () => {
    const env = baseEnv({
      GOOGLE_SHEETS_ACCESS_TOKEN: 'test-token',
      GMAIL_ACCESS_TOKEN: 'gmail-token',
      CREEMA_EMAIL: 'creema@example.com',
      CREEMA_PASSWORD: 'secret',
    });
    const container = createContainer(env);
    const useCase = container.getFetchNewOrdersUseCase('creema');
    expect(useCase.execute).toBeDefined();
  });

  it('fetch(creema) で CREEMA_EMAIL/PASSWORD 未設定時はエラー', () => {
    const env = baseEnv({
      GOOGLE_SHEETS_ACCESS_TOKEN: 'test-token',
      GMAIL_ACCESS_TOKEN: 'gmail-token',
    });
    const container = createContainer(env);
    expect(() => container.getFetchNewOrdersUseCase('creema')).toThrow(
      'CREEMA_EMAIL / CREEMA_PASSWORD が設定されていません',
    );
  });
});

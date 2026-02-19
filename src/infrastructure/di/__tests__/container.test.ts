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

function baseEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    GOOGLE_SHEETS_SPREADSHEET_ID: 'test-spreadsheet-id',
    ...overrides,
  };
}

describe('createContainer', () => {
  it('GOOGLE_SERVICE_ACCOUNT_KEY で Container を生成できる', () => {
    const env = baseEnv({ GOOGLE_SERVICE_ACCOUNT_KEY: VALID_SERVICE_ACCOUNT_JSON });
    const container = createContainer(env);
    expect(container.getListPendingOrdersUseCase).toBeDefined();
  });

  it('GOOGLE_SHEETS_ACCESS_TOKEN で Container を生成できる', () => {
    const env = baseEnv({ GOOGLE_SHEETS_ACCESS_TOKEN: 'test-token' });
    const container = createContainer(env);
    expect(container.getListPendingOrdersUseCase).toBeDefined();
  });

  it('認証情報がない場合はエラーを投げる', () => {
    const env = baseEnv();
    expect(() => createContainer(env)).toThrow('Google Sheets 認証情報が不足しています');
  });

  it('GOOGLE_SHEETS_SPREADSHEET_ID がない場合はエラーを投げる', () => {
    const env = { GOOGLE_SERVICE_ACCOUNT_KEY: VALID_SERVICE_ACCOUNT_JSON };
    expect(() => createContainer(env)).toThrow('GOOGLE_SHEETS_SPREADSHEET_ID is not configured');
  });

  it('不正な JSON の GOOGLE_SERVICE_ACCOUNT_KEY はエラーを投げる', () => {
    const env = baseEnv({ GOOGLE_SERVICE_ACCOUNT_KEY: 'not-json' });
    expect(() => createContainer(env)).toThrow('JSON パースに失敗しました');
  });

  it('client_email が欠けた GOOGLE_SERVICE_ACCOUNT_KEY はエラーを投げる', () => {
    const env = baseEnv({
      GOOGLE_SERVICE_ACCOUNT_KEY: JSON.stringify({ private_key: TEST_PRIVATE_KEY }),
    });
    expect(() => createContainer(env)).toThrow('client_email と private_key が含まれていません');
  });

  it('private_key が欠けた GOOGLE_SERVICE_ACCOUNT_KEY はエラーを投げる', () => {
    const env = baseEnv({
      GOOGLE_SERVICE_ACCOUNT_KEY: JSON.stringify({
        client_email: 'test@test.iam.gserviceaccount.com',
      }),
    });
    expect(() => createContainer(env)).toThrow('client_email と private_key が含まれていません');
  });
});

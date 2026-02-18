import { describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  ExternalServiceError,
  NotFoundError,
} from '@/infrastructure/errors/HttpErrors';
import { GoogleSheetsClient } from '../SheetsClient';

describe('GoogleSheetsClient', () => {
  it('readRows は Authorization ヘッダー付きで GET する', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ values: [['A', 'B']] }),
    });

    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-123',
      },
      fetcher,
    );

    const rows = await client.readRows();
    expect(rows).toEqual([['A', 'B']]);

    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('writeRows は API key クエリを使わず Bearer トークンで PUT する', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });

    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-123',
      },
      fetcher,
    );

    await client.writeRows([['v1']], 'Orders!A2');

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/values/Orders!A2');
    expect(url).toContain('valueInputOption=RAW');
    expect(url).not.toContain('key=');
    expect(init.method).toBe('PUT');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('clearRows は Authorization ヘッダー付きで clear エンドポイントを呼ぶ', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });

    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-123',
      },
      fetcher,
    );

    await client.clearRows('Orders!A2:Z');

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(':clear');
    expect(url).not.toContain('key=');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('401/403 は AuthenticationError を投げる', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-123',
      },
      fetcher,
    );

    await expect(client.readRows()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('404 は NotFoundError を投げる', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-123',
      },
      fetcher,
    );

    await expect(client.writeRows([['v1']])).rejects.toBeInstanceOf(NotFoundError);
  });

  it('その他ステータスは ExternalServiceError を投げる', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-123',
      },
      fetcher,
    );

    await expect(client.clearRows()).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it('401 時に refresh token でアクセストークン更新し再試行する', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-refreshed', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [['A', 'B']] }),
      });

    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-expired',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tokenUrl: 'https://oauth2.example/token',
      },
      fetcher,
    );

    const rows = await client.readRows();
    expect(rows).toEqual([['A', 'B']]);

    const [firstUrl, firstInit] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(firstUrl).toContain('/values/Orders!A2%3AZ');
    expect((firstInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-expired',
    );

    const [tokenUrl, tokenInit] = fetcher.mock.calls[1] as [string, RequestInit];
    expect(tokenUrl).toBe('https://oauth2.example/token');
    expect(tokenInit.method).toBe('POST');
    expect((tokenInit.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );

    const [retryUrl, retryInit] = fetcher.mock.calls[2] as [string, RequestInit];
    expect(retryUrl).toContain('/values/Orders!A2%3AZ');
    expect((retryInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-refreshed',
    );
  });

  it('トークン更新失敗時は AuthenticationError を投げる', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 400 });

    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-expired',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tokenUrl: 'https://oauth2.example/token',
      },
      fetcher,
    );

    await expect(client.readRows()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('アクセストークンもリフレッシュ設定も未指定の場合は AuthenticationError を投げる', async () => {
    const fetcher = vi.fn();
    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
      },
      fetcher,
    );

    await expect(client.readRows()).rejects.toBeInstanceOf(AuthenticationError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('403 時も refresh token でアクセストークン更新し再試行する', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-refreshed-403', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [['C', 'D']] }),
      });

    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-expired',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      },
      fetcher,
    );

    const rows = await client.readRows();
    expect(rows).toEqual([['C', 'D']]);

    const [, retryInit] = fetcher.mock.calls[2] as [string, RequestInit];
    expect((retryInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-refreshed-403',
    );
  });

  it('トークン更新レスポンスに access_token がない場合は AuthenticationError を投げる', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expires_in: 3600 }),
      });

    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-expired',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      },
      fetcher,
    );

    await expect(client.readRows()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('期限内キャッシュがある場合はトークン更新せず既存トークンを再利用する', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ values: [['E', 'F']] }),
    });

    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-keep',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      },
      fetcher,
    );

    await client.readRows();
    await client.readRows();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).not.toContain('oauth2.googleapis.com/token');
    expect(fetcher.mock.calls[1]?.[0]).not.toContain('oauth2.googleapis.com/token');
  });

  it('期限切れトークンかつ更新手段なしの場合は API 呼び出し前に AuthenticationError を投げる', async () => {
    const fetcher = vi.fn();
    const client = new GoogleSheetsClient(
      {
        spreadsheetId: 'spreadsheet-id',
        sheetName: 'Orders',
        accessToken: 'token-expired',
      },
      fetcher,
    );

    (client as unknown as { accessTokenExpiresAt?: number }).accessTokenExpiresAt =
      Date.now() - 1_000;

    await expect(client.readRows()).rejects.toBeInstanceOf(AuthenticationError);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

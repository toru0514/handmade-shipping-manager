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
});

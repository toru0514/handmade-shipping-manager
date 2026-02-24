import { describe, expect, it, vi } from 'vitest';
import { AuthenticationError, ExternalServiceError } from '@/infrastructure/errors/HttpErrors';
import { GmailClient } from '../GmailClient';

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

describe('GmailClient', () => {
  it('アクセストークン未設定は AuthenticationError を投げる', () => {
    expect(() => new GmailClient({ accessToken: '   ' })).toThrow(AuthenticationError);
  });

  it('購入通知メールを判定し、注文IDを抽出できる', async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          messages: [{ id: 'm1' }, { id: 'm2' }],
        }),
        { status: 200 },
      ),
    );
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'm1',
          payload: {
            headers: [
              { name: 'Subject', value: 'minneで商品が購入されました' },
              { name: 'From', value: 'no-reply@minne.com' },
            ],
            body: { data: toBase64Url('注文ID: MN-123456') },
          },
          internalDate: '1700000000000',
        }),
        { status: 200 },
      ),
    );
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'm2',
          payload: {
            headers: [
              { name: 'Subject', value: 'Creema購入通知' },
              { name: 'From', value: 'notice@creema.jp' },
            ],
            parts: [
              {
                mimeType: 'text/plain',
                body: { data: toBase64Url('ご注文番号：CR-999999') },
              },
            ],
          },
          internalDate: '1700000001000',
        }),
        { status: 200 },
      ),
    );

    const client = new GmailClient(
      {
        accessToken: 'access-token',
      },
      fetcher,
    );

    const notifications = await client.listUnreadPurchaseNotifications();
    expect(notifications).toEqual([
      {
        messageId: 'm1',
        platform: 'minne',
        orderId: 'MN-123456',
        subject: 'minneで商品が購入されました',
        receivedAt: '1700000000000',
      },
      {
        messageId: 'm2',
        platform: 'creema',
        orderId: 'CR-999999',
        subject: 'Creema購入通知',
        receivedAt: '1700000001000',
      },
    ]);
  });

  it('購入通知でないメールは除外される', async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          messages: [{ id: 'm1' }],
        }),
        { status: 200 },
      ),
    );
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'm1',
          payload: {
            headers: [
              { name: 'Subject', value: '通常のお知らせ' },
              { name: 'From', value: 'notice@example.com' },
            ],
            body: { data: toBase64Url('本文') },
          },
        }),
        { status: 200 },
      ),
    );

    const client = new GmailClient({ accessToken: 'access-token' }, fetcher);
    const notifications = await client.listUnreadPurchaseNotifications();
    expect(notifications).toEqual([]);
  });

  it('Gmail API エラー時は ExternalServiceError を投げる', async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
    fetcher.mockResolvedValueOnce(new Response('error', { status: 503 }));

    const client = new GmailClient({ accessToken: 'access-token' }, fetcher);
    await expect(client.listUnreadPurchaseNotifications()).rejects.toThrow(ExternalServiceError);
  });

  it('extractOrderId は本文から注文IDを抽出する', () => {
    expect(GmailClient.extractOrderId('注文番号: AB-123456')).toBe('AB-123456');
    expect(GmailClient.extractOrderId('Order ID #ZXCVB12345')).toBe('ZXCVB12345');
    expect(GmailClient.extractOrderId('注文情報なし')).toBeNull();
  });

  it('extractOrderId は件名の [注文ID: 53539011] 形式を抽出できる', () => {
    expect(GmailClient.extractOrderId('【minne】作品の注文が入りました [注文ID: 53539011]')).toBe(
      '53539011',
    );
  });
});

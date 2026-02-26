import { describe, expect, it, vi } from 'vitest';
import { AuthenticationError, ExternalServiceError } from '@/infrastructure/errors/HttpErrors';
import { GmailClient, GoogleGmailClient } from '../GmailClient';

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
});

// ---------------------------------------------------------------------------
// GoogleGmailClient — OAuth2 リフレッシュトークン対応 / minne 購入通知対応
// ---------------------------------------------------------------------------

/** minne 購入通知メール本文（URL形式で注文ID含む）のモック */
function buildOrderEmailBody(orderId: string): string {
  return (
    `ご購入ありがとうございます。\n` +
    `注文の詳細は以下からご確認ください。\n` +
    `https://minne.com/account/orders/${orderId}?utm_campaign=order\n`
  );
}

/** Gmail messages.list レスポンスのモック */
function listResponse(ids: string[]) {
  return new Response(JSON.stringify({ messages: ids.map((id) => ({ id })) }), { status: 200 });
}

/** Gmail messages.get レスポンスのモック（text/plain 形式） */
function messageResponse(id: string, body: string) {
  return new Response(
    JSON.stringify({
      id,
      internalDate: '1700000000000',
      payload: {
        mimeType: 'text/plain',
        body: { data: toBase64Url(body) },
      },
    }),
    { status: 200 },
  );
}

describe('GoogleGmailClient', () => {
  describe('fetchUnreadMinneOrderEmails', () => {
    it('is:unread from:order@minne.com クエリで未読注文メールを取得できる', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
      fetcher
        .mockResolvedValueOnce(listResponse(['m1', 'm2']))
        .mockResolvedValueOnce(messageResponse('m1', buildOrderEmailBody('53509952')))
        .mockResolvedValueOnce(messageResponse('m2', buildOrderEmailBody('53611843')));

      const client = new GoogleGmailClient({ accessToken: 'test-token' }, fetcher);
      const results = await client.fetchUnreadMinneOrderEmails();

      expect(results).toEqual([
        { messageId: 'm1', orderId: '53509952' },
        { messageId: 'm2', orderId: '53611843' },
      ]);

      // クエリ文字列の確認（encodeURIComponent はスペースを %20 に変換する）
      const firstCallUrl = String(fetcher.mock.calls[0][0]);
      expect(firstCallUrl).toContain('is%3Aunread%20from%3Aorder%40minne.com');
    });

    it('URL パターンから orderId を抽出できる', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
      fetcher
        .mockResolvedValueOnce(listResponse(['m1']))
        .mockResolvedValueOnce(
          messageResponse('m1', 'https://minne.com/account/orders/99887766?utm_source=email'),
        );

      const client = new GoogleGmailClient({ accessToken: 'test-token' }, fetcher);
      const results = await client.fetchUnreadMinneOrderEmails();

      expect(results[0].orderId).toBe('99887766');
    });

    it('テキストパターン「注文ID：XXXXXX」から orderId を抽出できる', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
      fetcher
        .mockResolvedValueOnce(listResponse(['m1']))
        .mockResolvedValueOnce(
          messageResponse('m1', '注文ID：53509952\nご購入ありがとうございます。'),
        );

      const client = new GoogleGmailClient({ accessToken: 'test-token' }, fetcher);
      const results = await client.fetchUnreadMinneOrderEmails();

      expect(results[0].orderId).toBe('53509952');
    });

    it('注文IDが取得できないメールはスキップする', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
      fetcher
        .mockResolvedValueOnce(listResponse(['m1']))
        .mockResolvedValueOnce(messageResponse('m1', '購入のお知らせ（注文ID不明）'));

      const client = new GoogleGmailClient({ accessToken: 'test-token' }, fetcher);
      const results = await client.fetchUnreadMinneOrderEmails();

      expect(results).toHaveLength(0);
    });

    it('メールが存在しない場合は空配列を返す', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

      const client = new GoogleGmailClient({ accessToken: 'test-token' }, fetcher);
      const results = await client.fetchUnreadMinneOrderEmails();

      expect(results).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('指定メッセージIDに removeLabelIds: [UNREAD] を POST する', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
      fetcher.mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const client = new GoogleGmailClient({ accessToken: 'test-token' }, fetcher);
      await client.markAsRead('message-abc');

      const [url, init] = fetcher.mock.calls[0];
      expect(String(url)).toContain('/messages/message-abc/modify');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({ removeLabelIds: ['UNREAD'] });
    });

    it('API エラー時は ExternalServiceError を投げる', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
      // リトライ条件は 401/403 のみ。500 は即エラーになる
      fetcher.mockResolvedValueOnce(new Response('error', { status: 500 }));

      const client = new GoogleGmailClient({ accessToken: 'test-token' }, fetcher);
      await expect(client.markAsRead('message-xyz')).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('アクセストークン管理', () => {
    it('accessToken が未設定の場合は refreshToken でトークンを取得する', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

      // 1回目: token refresh
      fetcher.mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'refreshed-token', expires_in: 3600 }), {
          status: 200,
        }),
      );
      // 2回目: messages list
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

      const client = new GoogleGmailClient(
        {
          refreshToken: 'my-refresh-token',
          clientId: 'client-id',
          clientSecret: 'client-secret',
        },
        fetcher,
      );

      await client.fetchUnreadMinneOrderEmails();

      // 1回目がトークンリフレッシュであることを確認
      const tokenUrl = String(fetcher.mock.calls[0][0]);
      expect(tokenUrl).toContain('oauth2.googleapis.com/token');

      // 2回目のリクエストが refreshed-token を使っていることを確認
      const authHeader = (fetcher.mock.calls[1][1]?.headers as Record<string, string>)
        ?.Authorization;
      expect(authHeader).toBe('Bearer refreshed-token');
    });

    it('accessToken も refreshToken も未設定の場合は AuthenticationError を投げる', async () => {
      const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
      const client = new GoogleGmailClient({}, fetcher);

      await expect(client.fetchUnreadMinneOrderEmails()).rejects.toThrow(AuthenticationError);
    });
  });
});

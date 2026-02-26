import { AuthenticationError, ExternalServiceError } from '@/infrastructure/errors/HttpErrors';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface GmailMessageId {
  id: string;
}

interface GmailMessagesListResponse {
  messages?: GmailMessageId[];
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailBody {
  data?: string;
}

interface GmailPayload {
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPayload[];
  mimeType?: string;
}

interface GmailMessageGetResponse {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailPayload;
}

export type PurchasePlatform = 'minne' | 'creema';

export interface GmailMessage {
  readonly id: string;
  readonly subject: string;
  readonly from: string;
  readonly body: string;
  readonly internalDate?: string;
}

export interface PurchaseNotification {
  readonly messageId: string;
  readonly platform: PurchasePlatform;
  readonly orderId: string;
  readonly subject: string;
  readonly receivedAt?: string;
}

export interface GmailClientConfig {
  readonly accessToken: string;
  readonly baseUrl?: string;
}

const DEFAULT_QUERY = 'is:unread newer_than:7d (from:minne.com OR from:creema.jp)';
const DEFAULT_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly fetcher: FetchLike;

  constructor(config: GmailClientConfig, fetcher: FetchLike = fetch) {
    const accessToken = config.accessToken.trim();
    if (!accessToken) {
      throw new AuthenticationError('Gmail API のアクセストークンが設定されていません');
    }
    this.accessToken = accessToken;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.fetcher = fetcher;
  }

  async listUnreadPurchaseNotifications(
    query: string = DEFAULT_QUERY,
  ): Promise<PurchaseNotification[]> {
    const messages = await this.listMessages(query);
    const notifications: PurchaseNotification[] = [];

    for (const message of messages) {
      const platform = this.detectPlatform(message.from);
      if (!platform || !GmailClient.isPurchaseNotification(message)) {
        continue;
      }

      const orderId = GmailClient.extractOrderId(message.body);
      if (!orderId) {
        continue;
      }

      notifications.push({
        messageId: message.id,
        platform,
        orderId,
        subject: message.subject,
        receivedAt: message.internalDate,
      });
    }

    return notifications;
  }

  async listMessages(query: string, maxResults: number = 20): Promise<GmailMessage[]> {
    const listUrl = new URL(`${this.baseUrl}/messages`);
    listUrl.searchParams.set('q', query);
    listUrl.searchParams.set('maxResults', String(maxResults));

    const listResponse = await this.request(listUrl.toString(), {
      method: 'GET',
      headers: this.buildAuthHeaders(),
    });
    const listPayload = (await listResponse.json()) as GmailMessagesListResponse;
    const messages = listPayload.messages ?? [];

    const detailedMessages: GmailMessage[] = [];
    for (const message of messages) {
      const detail = await this.getMessage(message.id);
      detailedMessages.push(detail);
    }

    return detailedMessages;
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    const detailUrl = new URL(`${this.baseUrl}/messages/${messageId}`);
    detailUrl.searchParams.set('format', 'full');

    const response = await this.request(detailUrl.toString(), {
      method: 'GET',
      headers: this.buildAuthHeaders(),
    });
    const payload = (await response.json()) as GmailMessageGetResponse;
    const headers = payload.payload?.headers ?? [];
    const subject = this.getHeader(headers, 'subject');
    const from = this.getHeader(headers, 'from');
    const body = this.extractBody(payload.payload) || payload.snippet || '';

    return {
      id: payload.id,
      subject,
      from,
      body,
      internalDate: payload.internalDate,
    };
  }

  static isPurchaseNotification(message: GmailMessage): boolean {
    const from = message.from.toLowerCase();
    const isTargetPlatform = from.includes('minne') || from.includes('creema');
    if (!isTargetPlatform) {
      return false;
    }

    const combinedText = `${message.subject}\n${message.body}`;
    return /(購入|注文|売れました|取引|お買い上げ)/.test(combinedText);
  }

  static extractOrderId(body: string): string | null {
    const patterns = [
      /(?:注文(?:ID|番号)|オーダーID|取引ID|order(?:\s*id)?)[^\w-]*([A-Za-z0-9][A-Za-z0-9-]{4,})/i,
      /#([A-Za-z0-9][A-Za-z0-9-]{5,})/,
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      const candidate = match?.[1]?.trim();
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }

  private buildAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const response = await this.fetcher(url, init);
    if (!response.ok) {
      throw new ExternalServiceError(
        `Gmail API リクエストに失敗しました (status=${response.status})`,
      );
    }
    return response;
  }

  private detectPlatform(from: string): PurchasePlatform | null {
    const lowerFrom = from.toLowerCase();
    if (lowerFrom.includes('minne')) {
      return 'minne';
    }
    if (lowerFrom.includes('creema')) {
      return 'creema';
    }
    return null;
  }

  private getHeader(headers: GmailHeader[], name: string): string {
    const header = headers.find((item) => item.name.toLowerCase() === name.toLowerCase());
    return header?.value ?? '';
  }

  private extractBody(payload?: GmailPayload): string {
    if (!payload) {
      return '';
    }

    if (payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }

    const parts = payload.parts ?? [];
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return this.decodeBase64Url(part.body.data);
      }
    }

    for (const part of parts) {
      const nested = this.extractBody(part);
      if (nested) {
        return nested;
      }
    }

    return '';
  }

  private decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(normalized + padding, 'base64').toString('utf8');
  }
}

// ---------------------------------------------------------------------------
// GoogleGmailClient — OAuth2 リフレッシュトークン対応 / minne マジックリンク対応
// ---------------------------------------------------------------------------

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface GoogleGmailClientConfig {
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly baseUrl?: string;
  readonly tokenUrl?: string;
}

export interface MagicLinkPollOptions {
  readonly intervalMs?: number;
  readonly timeoutMs?: number;
}

/** minne の購入通知メールから抽出した注文情報 */
export interface UnreadOrderEmail {
  /** Gmail メッセージ ID（既読化に使用） */
  readonly messageId: string;
  /** minne の注文 ID */
  readonly orderId: string;
}

interface GoogleGmailListResponse {
  messages?: Array<{ id: string }>;
}

interface GoogleGmailMessageDetail {
  internalDate?: string;
  payload: GoogleGmailPayload;
}

interface GoogleGmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GoogleGmailPayload[];
}

export class GoogleGmailClient {
  private readonly fetcher: FetchLike;
  private accessToken: string | undefined;
  private accessTokenExpiresAt: number | undefined;

  constructor(
    private readonly config: GoogleGmailClientConfig,
    fetcher: FetchLike = fetch,
  ) {
    this.fetcher = fetcher;
    this.accessToken = config.accessToken;
  }

  /**
   * minne のログインリンクメールを Gmail から取得してマジックリンク URL を返す。
   * sentAfter 以降に届いたメールのみを対象とし、見つかるまでポーリングする。
   */
  async fetchMinneMagicLink(sentAfter: Date, options: MagicLinkPollOptions = {}): Promise<string> {
    const intervalMs = options.intervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 60_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const link = await this.tryFetchMagicLink(sentAfter);
      if (link) return link;

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await sleepMs(Math.min(intervalMs, remaining));
    }

    throw new ExternalServiceError(
      `minne ログインリンクメールの取得がタイムアウトしました (${timeoutMs / 1000}秒)。` +
        '手動でメールのURLを貼り付けてください。',
    );
  }

  /**
   * Gmail の未読 minne 購入通知メール（from: order@minne.com）から注文IDを一括取得する。
   */
  async fetchUnreadMinneOrderEmails(): Promise<UnreadOrderEmail[]> {
    const query = 'is:unread from:order@minne.com';
    const url = `${this.getBaseUrl()}/messages?q=${encodeURIComponent(query)}&maxResults=50`;
    const data = await this.googleGet<GoogleGmailListResponse>(url);
    if (!data.messages || data.messages.length === 0) return [];

    const results: UnreadOrderEmail[] = [];
    for (const msg of data.messages) {
      const body = await this.getMessagePlainText(msg.id);
      const orderId = this.extractMinneOrderId(body);
      if (orderId) {
        results.push({ messageId: msg.id, orderId });
      }
    }
    return results;
  }

  /**
   * Gmail メッセージを既読にマークする（処理済み注文の再取得を防ぐ）。
   */
  async markAsRead(messageId: string): Promise<void> {
    const url = `${this.getBaseUrl()}/messages/${messageId}/modify`;
    await this.googlePostJson(url, { removeLabelIds: ['UNREAD'] });
  }

  private extractMinneOrderId(body: string): string | null {
    // URL 例: https://minne.com/account/orders/53509952?utm_...
    const urlMatch = body.match(/minne\.com\/account\/orders\/(\d+)/);
    if (urlMatch?.[1]) return urlMatch[1];

    // フォールバック: 本文の「注文ID： 53509952」形式
    const textMatch = body.match(/注文ID\s*[：:]\s*(\d+)/);
    return textMatch?.[1] ?? null;
  }

  private async tryFetchMagicLink(sentAfter: Date): Promise<string | null> {
    try {
      const query = 'from:login@minne.com subject:ログインリンクを発行しました';
      const messageId = await this.findLatestMessageAfter(query, sentAfter);
      if (!messageId) return null;

      const body = await this.getMessagePlainText(messageId);
      return this.extractMagicLink(body);
    } catch {
      return null;
    }
  }

  private async findLatestMessageAfter(query: string, sentAfter: Date): Promise<string | null> {
    const url = `${this.getBaseUrl()}/messages?q=${encodeURIComponent(query)}&maxResults=5`;
    const data = await this.googleGet<GoogleGmailListResponse>(url);
    if (!data.messages || data.messages.length === 0) return null;

    for (const msg of data.messages) {
      const detail = await this.getMessageDetail(msg.id);
      const internalDate = parseInt(detail.internalDate ?? '0', 10);
      if (internalDate >= sentAfter.getTime()) {
        return msg.id;
      }
    }
    return null;
  }

  private async getMessageDetail(messageId: string): Promise<GoogleGmailMessageDetail> {
    const url = `${this.getBaseUrl()}/messages/${messageId}?format=full`;
    return this.googleGet<GoogleGmailMessageDetail>(url);
  }

  private async getMessagePlainText(messageId: string): Promise<string> {
    const detail = await this.getMessageDetail(messageId);
    return this.extractTextFromPayload(detail.payload);
  }

  private extractTextFromPayload(payload: GoogleGmailPayload): string {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return decodeBase64Url(payload.body.data);
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return decodeBase64Url(part.body.data);
        }
      }
      for (const part of payload.parts) {
        const text = this.extractTextFromPayload(part);
        if (text) return text;
      }
    }
    return '';
  }

  private extractMagicLink(body: string): string | null {
    const match = body.match(/https:\/\/minne\.com\/users\/sign_in\/magic_link\S*/);
    return match ? match[0] : null;
  }

  private async googleGet<T>(url: string): Promise<T> {
    const response = await this.requestWithAuth(url, { method: 'GET' });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(`Gmail API 認証エラー: ${response.status}`);
      }
      throw new ExternalServiceError(`Gmail API エラー: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  private async googlePostJson(url: string, body: unknown): Promise<void> {
    const response = await this.requestWithAuth(url, {
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new ExternalServiceError(
        `Gmail API POST エラー: ${response.status} ${response.statusText}`,
      );
    }
  }

  private async requestWithAuth(
    url: string,
    options: { method: 'GET' | 'POST'; contentType?: string; body?: BodyInit },
  ): Promise<Response> {
    const headers: Record<string, string> = await this.createAuthHeaders();
    if (options.contentType) headers['Content-Type'] = options.contentType;

    const res = await this.fetcher(url, { method: options.method, headers, body: options.body });

    if (!res.ok && (res.status === 401 || res.status === 403)) {
      await this.refreshAccessToken();
      const retryHeaders: Record<string, string> = await this.createAuthHeaders();
      if (options.contentType) retryHeaders['Content-Type'] = options.contentType;
      return this.fetcher(url, {
        method: options.method,
        headers: retryHeaders,
        body: options.body,
      });
    }

    return res;
  }

  private async createAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getGoogleAccessToken();
    return { Authorization: `Bearer ${token}` };
  }

  private async getGoogleAccessToken(): Promise<string> {
    if (
      this.accessToken &&
      (this.accessTokenExpiresAt === undefined || Date.now() < this.accessTokenExpiresAt - 30_000)
    ) {
      return this.accessToken;
    }

    if (this.canRefreshToken()) {
      await this.refreshAccessToken();
    } else {
      throw new AuthenticationError(
        'Gmail API のアクセストークンが設定されていないか期限切れです。' +
          'GMAIL_ACCESS_TOKEN または GMAIL_REFRESH_TOKEN を設定してください。',
      );
    }

    if (!this.accessToken) {
      throw new AuthenticationError('Gmail API のアクセストークンを取得できませんでした');
    }

    return this.accessToken;
  }

  private canRefreshToken(): boolean {
    return Boolean(this.config.refreshToken && this.config.clientId && this.config.clientSecret);
  }

  private async refreshAccessToken(): Promise<void> {
    const { refreshToken, clientId, clientSecret } = this.config;
    if (!refreshToken || !clientId || !clientSecret) {
      throw new AuthenticationError('Google OAuth2 リフレッシュトークン設定が不足しています');
    }

    const response = await this.fetcher(this.getTokenUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new AuthenticationError('Google OAuth2 アクセストークン更新に失敗しました');
    }

    const payload = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!payload.access_token) {
      throw new AuthenticationError('Google OAuth2 トークン更新レスポンスが不正です');
    }

    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt =
      typeof payload.expires_in === 'number' ? Date.now() + payload.expires_in * 1000 : undefined;
  }

  private getBaseUrl(): string {
    return this.config.baseUrl ?? GMAIL_API_BASE;
  }

  private getTokenUrl(): string {
    return this.config.tokenUrl ?? 'https://oauth2.googleapis.com/token';
  }
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

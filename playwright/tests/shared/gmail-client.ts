/**
 * Gmail API client for fetching minne magic link login emails.
 * Uses OAuth2 with automatic token refresh.
 */

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface GmailClientConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly accessToken: string;
  readonly refreshToken: string;
}

interface MagicLinkPollOptions {
  readonly pollIntervalMs?: number;
  readonly timeoutMs?: number;
}

interface GmailListResponse {
  messages?: Array<{ id: string }>;
}

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
}

interface GmailMessageDetail {
  internalDate?: string;
  payload: GmailPayload;
}

export class GmailClient {
  private accessToken: string;
  private readonly refreshToken: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: GmailClientConfig) {
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  /**
   * minne のログインリンクメールを Gmail からポーリングして取得する。
   * sentAfter 以降に届いたメールのみを対象とする。
   */
  async fetchMinneMagicLink(sentAfter: Date, options: MagicLinkPollOptions = {}): Promise<string> {
    const pollIntervalMs = options.pollIntervalMs ?? 3_000;
    const timeoutMs = options.timeoutMs ?? 60_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const link = await this.tryFetchMagicLink(sentAfter);
      if (link) return link;

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await sleep(Math.min(pollIntervalMs, remaining));
    }

    throw new Error(
      `minne ログインリンクメールの取得がタイムアウトしました (${timeoutMs / 1000}秒)。`,
    );
  }

  private async tryFetchMagicLink(sentAfter: Date): Promise<string | null> {
    try {
      const query = 'from:login@minne.com subject:ログインリンクを発行しました';
      const messageId = await this.findLatestMessageAfter(query, sentAfter);
      if (!messageId) return null;

      const body = await this.getMessagePlainText(messageId);
      return extractMagicLink(body);
    } catch {
      return null;
    }
  }

  private async findLatestMessageAfter(query: string, sentAfter: Date): Promise<string | null> {
    const url = `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=5`;
    const data = await this.gmailGet<GmailListResponse>(url);
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

  private async getMessageDetail(messageId: string): Promise<GmailMessageDetail> {
    const url = `${GMAIL_API_BASE}/messages/${messageId}?format=full`;
    return this.gmailGet<GmailMessageDetail>(url);
  }

  private async getMessagePlainText(messageId: string): Promise<string> {
    const detail = await this.getMessageDetail(messageId);
    return extractTextFromPayload(detail.payload);
  }

  private async gmailGet<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (res.status === 401 || res.status === 403) {
      await this.refreshAccessToken();
      const retry = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!retry.ok) {
        throw new Error(`Gmail API エラー: ${retry.status} ${retry.statusText}`);
      }
      return retry.json() as Promise<T>;
    }

    if (!res.ok) {
      throw new Error(`Gmail API エラー: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  private async refreshAccessToken(): Promise<void> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `OAuth2 トークン更新に失敗しました (status=${res.status}) ${detail.slice(0, 300)}`,
      );
    }

    const payload = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token) {
      throw new Error('OAuth2 トークン更新レスポンスが不正です');
    }
    this.accessToken = payload.access_token;
  }
}

function extractMagicLink(body: string): string | null {
  const match = body.match(/https:\/\/minne\.com\/users\/sign_in\/magic_link\S*/);
  return match ? match[0] : null;
}

function extractTextFromPayload(payload: GmailPayload): string {
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
      const text = extractTextFromPayload(part);
      if (text) return text;
    }
  }
  return '';
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

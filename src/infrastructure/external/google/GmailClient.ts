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

const DEFAULT_QUERY = 'is:unread newer_than:7d (from:order@minne.com OR from:info@creema.jp)';
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

      const orderId = GmailClient.extractOrderId(`${message.subject}\n${message.body}`);
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

import { createSign } from 'node:crypto';

import {
  AuthenticationError,
  ExternalServiceError,
  NotFoundError,
} from '@/infrastructure/errors/HttpErrors';

export interface SheetsClient {
  readRows(range?: string): Promise<string[][]>;
  writeRows(rows: string[][], range?: string): Promise<void>;
  clearRows(range?: string): Promise<void>;
}

export interface ServiceAccountKey {
  readonly client_email: string;
  readonly private_key: string;
}

interface SheetsValuesResponse {
  values?: string[][];
}

interface SheetsClientConfig {
  readonly spreadsheetId: string;
  readonly sheetName: string;
  readonly serviceAccountKey?: ServiceAccountKey;
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly baseUrl?: string;
  readonly tokenUrl?: string;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class GoogleSheetsClient implements SheetsClient {
  private readonly config: SheetsClientConfig;
  private readonly fetcher: FetchLike;
  private accessToken?: string;
  private accessTokenExpiresAt?: number;

  constructor(config: SheetsClientConfig, fetcher: FetchLike = fetch) {
    this.config = config;
    this.fetcher = fetcher;
    this.accessToken = config.accessToken;
  }

  async readRows(range?: string): Promise<string[][]> {
    const targetRange = range ?? `${this.config.sheetName}!A2:Z`;
    const response = await this.requestWithAuth(this.buildValuesUrl(targetRange), {
      method: 'GET',
    });

    if (!response.ok) {
      throw this.toHttpError('read', response.status);
    }

    const payload = (await response.json()) as SheetsValuesResponse;
    return payload.values ?? [];
  }

  async writeRows(rows: string[][], range?: string): Promise<void> {
    const targetRange = range ?? `${this.config.sheetName}!A2`;

    const response = await this.requestWithAuth(this.buildValuesUrl(targetRange, 'RAW'), {
      method: 'PUT',
      contentType: 'application/json',
      body: JSON.stringify({ values: rows }),
    });

    if (!response.ok) {
      throw this.toHttpError('write', response.status);
    }
  }

  async clearRows(range?: string): Promise<void> {
    const targetRange = range ?? `${this.config.sheetName}!A2:Z`;
    const encodedRange = encodeURIComponent(targetRange);
    const response = await this.requestWithAuth(
      `${this.getBaseUrl()}/v4/spreadsheets/${this.config.spreadsheetId}/values/${encodedRange}:clear`,
      {
        method: 'POST',
        contentType: 'application/json',
      },
    );

    if (!response.ok) {
      throw this.toHttpError('clear', response.status);
    }
  }

  private buildValuesUrl(range: string, valueInputOption?: 'RAW'): string {
    const encodedRange = encodeURIComponent(range);
    const base = `${this.getBaseUrl()}/v4/spreadsheets/${this.config.spreadsheetId}/values/${encodedRange}`;
    const query = new URLSearchParams();

    if (valueInputOption) {
      query.set('valueInputOption', valueInputOption);
    }

    return query.size > 0 ? `${base}?${query.toString()}` : base;
  }

  private async createAuthHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.getAccessToken();
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (
      this.accessToken &&
      (this.accessTokenExpiresAt === undefined || Date.now() < this.accessTokenExpiresAt - 30_000)
    ) {
      return this.accessToken;
    }

    if (this.config.serviceAccountKey) {
      await this.fetchServiceAccountToken();
    } else if (this.canRefreshToken()) {
      await this.refreshAccessToken();
    } else if (
      this.accessTokenExpiresAt !== undefined &&
      Date.now() >= this.accessTokenExpiresAt - 30_000
    ) {
      throw new AuthenticationError(
        'アクセストークンが失効しており、更新する手段が設定されていません',
      );
    }

    if (!this.accessToken) {
      throw new AuthenticationError('Google Sheets API のアクセストークンが設定されていません');
    }

    return this.accessToken;
  }

  private canRefreshToken(): boolean {
    return Boolean(this.config.refreshToken && this.config.clientId && this.config.clientSecret);
  }

  private getRefreshCredentials(): {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  } | null {
    const refreshToken = this.config.refreshToken;
    const clientId = this.config.clientId;
    const clientSecret = this.config.clientSecret;

    if (refreshToken && clientId && clientSecret) {
      return { refreshToken, clientId, clientSecret };
    }

    return null;
  }

  private async refreshAccessToken(): Promise<void> {
    const credentials = this.getRefreshCredentials();
    if (!credentials) {
      throw new AuthenticationError('Google OAuth2 リフレッシュトークン設定が不足しています');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });

    const response = await this.fetcher(this.getTokenUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new AuthenticationError('Google OAuth2 アクセストークン更新に失敗しました');
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      throw new AuthenticationError('Google OAuth2 トークン更新レスポンスが不正です');
    }

    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt =
      typeof payload.expires_in === 'number' ? Date.now() + payload.expires_in * 1000 : undefined;
  }

  private async requestWithAuth(
    url: string,
    options: {
      method: 'GET' | 'PUT' | 'POST';
      contentType?: string;
      body?: BodyInit;
    },
  ): Promise<Response> {
    const headers: Record<string, string> = await this.createAuthHeaders();
    if (options.contentType) {
      headers['Content-Type'] = options.contentType;
    }

    const initialResponse = await this.fetcher(url, {
      method: options.method,
      headers,
      body: options.body,
    });

    if (!initialResponse.ok && (initialResponse.status === 401 || initialResponse.status === 403)) {
      if (this.config.serviceAccountKey) {
        await this.fetchServiceAccountToken();
      } else if (this.canRefreshToken()) {
        await this.refreshAccessToken();
      } else {
        return initialResponse;
      }
      const retryHeaders: Record<string, string> = await this.createAuthHeaders();
      if (options.contentType) {
        retryHeaders['Content-Type'] = options.contentType;
      }

      return this.fetcher(url, {
        method: options.method,
        headers: retryHeaders,
        body: options.body,
      });
    }

    return initialResponse;
  }

  private createServiceAccountJwt(): string {
    const key = this.config.serviceAccountKey!;
    const now = Math.floor(Date.now() / 1000);

    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const claims = JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: this.getTokenUrl(),
      exp: now + 3600,
      iat: now,
    });

    const encodedHeader = Buffer.from(header).toString('base64url');
    const encodedClaims = Buffer.from(claims).toString('base64url');
    const signInput = `${encodedHeader}.${encodedClaims}`;

    const signer = createSign('RSA-SHA256');
    signer.update(signInput);
    const signature = signer.sign(key.private_key, 'base64url');

    return `${signInput}.${signature}`;
  }

  private async fetchServiceAccountToken(): Promise<void> {
    const jwt = this.createServiceAccountJwt();

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });

    const response = await this.fetcher(this.getTokenUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new AuthenticationError('サービスアカウントのアクセストークン取得に失敗しました');
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      throw new AuthenticationError('サービスアカウントのトークンレスポンスが不正です');
    }

    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt =
      typeof payload.expires_in === 'number' ? Date.now() + payload.expires_in * 1000 : undefined;
  }

  private toHttpError(operation: 'read' | 'write' | 'clear', status: number) {
    if (status === 401 || status === 403) {
      return new AuthenticationError(`Google Sheets API ${operation} の認証に失敗しました`);
    }

    if (status === 404) {
      return new NotFoundError('Google Sheets の対象スプレッドシートが見つかりません');
    }

    return new ExternalServiceError(`Google Sheets API ${operation} に失敗しました (${status})`);
  }

  private getBaseUrl(): string {
    return this.config.baseUrl ?? 'https://sheets.googleapis.com';
  }

  private getTokenUrl(): string {
    return this.config.tokenUrl ?? 'https://oauth2.googleapis.com/token';
  }
}

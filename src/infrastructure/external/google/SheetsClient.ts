export interface SheetsClient {
  readRows(range?: string): Promise<string[][]>;
  writeRows(rows: string[][], range?: string): Promise<void>;
  clearRows(range?: string): Promise<void>;
}

interface SheetsValuesResponse {
  values?: string[][];
}

interface SheetsClientConfig {
  readonly spreadsheetId: string;
  readonly sheetName: string;
  readonly apiKey: string;
  readonly baseUrl?: string;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class GoogleSheetsClient implements SheetsClient {
  private readonly config: SheetsClientConfig;
  private readonly fetcher: FetchLike;

  constructor(config: SheetsClientConfig, fetcher: FetchLike = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  async readRows(range?: string): Promise<string[][]> {
    const targetRange = range ?? `${this.config.sheetName}!A2:Z`;
    const response = await this.fetcher(this.buildValuesUrl(targetRange), {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API read failed: ${response.status}`);
    }

    const payload = (await response.json()) as SheetsValuesResponse;
    return payload.values ?? [];
  }

  async writeRows(rows: string[][], range?: string): Promise<void> {
    const targetRange = range ?? `${this.config.sheetName}!A2`;

    const response = await this.fetcher(this.buildValuesUrl(targetRange, 'RAW'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API write failed: ${response.status}`);
    }
  }

  async clearRows(range?: string): Promise<void> {
    const targetRange = range ?? `${this.config.sheetName}!A2:Z`;
    const encodedRange = encodeURIComponent(targetRange);
    const response = await this.fetcher(
      `${this.getBaseUrl()}/v4/spreadsheets/${this.config.spreadsheetId}/values/${encodedRange}:clear?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok) {
      throw new Error(`Google Sheets API clear failed: ${response.status}`);
    }
  }

  private buildValuesUrl(range: string, valueInputOption?: 'RAW'): string {
    const encodedRange = encodeURIComponent(range);
    const base = `${this.getBaseUrl()}/v4/spreadsheets/${this.config.spreadsheetId}/values/${encodedRange}`;
    const query = new URLSearchParams({ key: this.config.apiKey });

    if (valueInputOption) {
      query.set('valueInputOption', valueInputOption);
    }

    return `${base}?${query.toString()}`;
  }

  private getBaseUrl(): string {
    return this.config.baseUrl ?? 'https://sheets.googleapis.com';
  }
}

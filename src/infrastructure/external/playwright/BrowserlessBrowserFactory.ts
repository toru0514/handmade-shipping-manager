import { chromium } from 'playwright-core';
import type {
  PlaywrightBrowserFactory,
  PlaywrightBrowserLike,
} from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type {
  YamatoBrowserFactory,
  YamatoBrowserLike,
} from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';
import type { PlaywrightPageLike } from './ClickPostPage';

interface BrowserInstance {
  newContext(options?: { ignoreHTTPSErrors?: boolean }): Promise<BrowserContextInstance>;
  close(): Promise<void>;
}

interface BrowserContextInstance {
  newPage(): Promise<PlaywrightPageLike>;
  close(): Promise<void>;
}

interface ChromiumConnector {
  connectOverCDP(endpointURL: string): Promise<BrowserInstance>;
}

export interface BrowserlessBrowserFactoryOptions {
  /** Browserless の WebSocket エンドポイント URL（例: ws://localhost:3000, wss://production-sfo.browserless.io?token=XXX） */
  readonly wsEndpoint: string;
  /** SSL証明書エラーを無視する（開発・テスト環境向け） */
  readonly ignoreHTTPSErrors?: boolean;
  /** テスト用: chromium インスタンスの差し替え */
  readonly chromiumInstance?: ChromiumConnector;
}

export class BrowserlessBrowserFactory implements PlaywrightBrowserFactory, YamatoBrowserFactory {
  private readonly wsEndpoint: string;
  private readonly ignoreHTTPSErrors: boolean;
  private readonly chromiumInstance: ChromiumConnector;

  constructor(options: BrowserlessBrowserFactoryOptions) {
    this.wsEndpoint = options.wsEndpoint;
    this.ignoreHTTPSErrors = options.ignoreHTTPSErrors ?? false;
    this.chromiumInstance = options.chromiumInstance ?? (chromium as unknown as ChromiumConnector);
  }

  async launch(): Promise<PlaywrightBrowserLike & YamatoBrowserLike> {
    const browser = await this.chromiumInstance.connectOverCDP(this.wsEndpoint);

    const context = await browser.newContext({
      ignoreHTTPSErrors: this.ignoreHTTPSErrors,
    });

    return {
      newPage: () => context.newPage(),
      close: async () => {
        await context.close();
        await browser.close();
      },
    };
  }
}

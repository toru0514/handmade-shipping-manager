import { chromium } from 'playwright';
import type {
  PlaywrightBrowserFactory,
  PlaywrightBrowserLike,
} from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type {
  YamatoBrowserFactory,
  YamatoBrowserLike,
} from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';
import type { PlaywrightPageLike } from './ClickPostPage';

interface ChromiumLike {
  launch(options: { headless: boolean; timeout?: number }): Promise<BrowserInstance>;
}

interface BrowserInstance {
  newContext(options?: { ignoreHTTPSErrors?: boolean }): Promise<BrowserContextInstance>;
  close(): Promise<void>;
}

interface BrowserContextInstance {
  newPage(): Promise<PlaywrightPageLike>;
  close(): Promise<void>;
}

export interface ChromiumBrowserFactoryOptions {
  readonly headless?: boolean;
  readonly timeoutMs?: number;
  readonly chromiumInstance?: ChromiumLike;
  /** SSL証明書エラーを無視する（開発・テスト環境向け） */
  readonly ignoreHTTPSErrors?: boolean;
}

export class ChromiumBrowserFactory implements PlaywrightBrowserFactory, YamatoBrowserFactory {
  private readonly headless: boolean;
  private readonly timeoutMs?: number;
  private readonly chromiumInstance: ChromiumLike;
  private readonly ignoreHTTPSErrors: boolean;

  constructor(options: ChromiumBrowserFactoryOptions = {}) {
    this.headless = options.headless ?? true;
    this.timeoutMs = options.timeoutMs;
    this.chromiumInstance = options.chromiumInstance ?? (chromium as unknown as ChromiumLike);
    this.ignoreHTTPSErrors = options.ignoreHTTPSErrors ?? false;
  }

  async launch(): Promise<PlaywrightBrowserLike & YamatoBrowserLike> {
    const browser = await this.chromiumInstance.launch({
      headless: this.headless,
      timeout: this.timeoutMs,
    });

    // SSL証明書エラーを無視するコンテキストを作成
    const context = await browser.newContext({
      ignoreHTTPSErrors: this.ignoreHTTPSErrors,
    });

    // ブラウザラッパーを返す（closeでcontextとbrowser両方をクリーンアップ）
    return {
      newPage: () => context.newPage(),
      close: async () => {
        await context.close();
        await browser.close();
      },
    };
  }
}

import { chromium } from 'playwright';
import type {
  PlaywrightBrowserFactory,
  PlaywrightBrowserLike,
} from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type {
  YamatoBrowserFactory,
  YamatoBrowserLike,
} from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';

interface ChromiumLike {
  launch(options: { headless: boolean; timeout?: number }): Promise<unknown>;
}

export interface ChromiumBrowserFactoryOptions {
  readonly headless?: boolean;
  readonly timeoutMs?: number;
  readonly chromiumInstance?: ChromiumLike;
}

export class ChromiumBrowserFactory implements PlaywrightBrowserFactory, YamatoBrowserFactory {
  private readonly headless: boolean;
  private readonly timeoutMs?: number;
  private readonly chromiumInstance: ChromiumLike;

  constructor(options: ChromiumBrowserFactoryOptions = {}) {
    this.headless = options.headless ?? true;
    this.timeoutMs = options.timeoutMs;
    this.chromiumInstance = options.chromiumInstance ?? chromium;
  }

  async launch(): Promise<PlaywrightBrowserLike & YamatoBrowserLike> {
    const browser = await this.chromiumInstance.launch({
      headless: this.headless,
      timeout: this.timeoutMs,
    });
    // Playwright Browser 型と adapter 側の BrowserLike 型を疎結合に保つため、
    // launch の戻り値はこの境界で明示的にキャストする。
    return browser as PlaywrightBrowserLike & YamatoBrowserLike;
  }
}

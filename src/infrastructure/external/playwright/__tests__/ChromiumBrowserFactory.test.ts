import { describe, expect, it, vi } from 'vitest';
import type { PlaywrightBrowserFactory } from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type { YamatoBrowserFactory } from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';
import { ChromiumBrowserFactory } from '../ChromiumBrowserFactory';

function createMockPage() {
  return {
    goto: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    waitForEvent: vi.fn(async () => ({ createReadStream: vi.fn(async () => null) })),
    textContent: vi.fn(async () => null),
  };
}

function createMockBrowser() {
  const mockPage = createMockPage();
  const mockContext = {
    newPage: vi.fn(async () => mockPage),
    close: vi.fn(async () => undefined),
  };
  return {
    newContext: vi.fn(async () => mockContext),
    close: vi.fn(async () => undefined),
    _mockContext: mockContext,
    _mockPage: mockPage,
  };
}

describe('ChromiumBrowserFactory', () => {
  it('PlaywrightBrowserFactory / YamatoBrowserFactory として利用できる', () => {
    const launch = vi.fn(async () => createMockBrowser());
    const factory = new ChromiumBrowserFactory({
      chromiumInstance: { launch },
    });

    const clickPostFactory: PlaywrightBrowserFactory = factory;
    const yamatoFactory: YamatoBrowserFactory = factory;

    expect(clickPostFactory).toBeDefined();
    expect(yamatoFactory).toBeDefined();
  });

  it('デフォルトは headless=true で launch する', async () => {
    const mockBrowser = createMockBrowser();
    const launch = vi.fn(async () => mockBrowser);
    const factory = new ChromiumBrowserFactory({
      chromiumInstance: { launch },
    });

    const launched = await factory.launch();

    expect(launch).toHaveBeenCalledWith({ headless: true, timeout: undefined });
    // ラッパーオブジェクトが返される
    expect(launched.newPage).toBeDefined();
    expect(launched.close).toBeDefined();
    // newPage はコンテキストの newPage を呼ぶ
    await launched.newPage();
    expect(mockBrowser._mockContext.newPage).toHaveBeenCalled();
  });

  it('headless/headful と timeout を指定できる', async () => {
    const mockBrowser = createMockBrowser();
    const launch = vi.fn(async () => mockBrowser);
    const factory = new ChromiumBrowserFactory({
      headless: false,
      timeoutMs: 45_000,
      chromiumInstance: { launch },
    });

    await factory.launch();

    expect(launch).toHaveBeenCalledWith({ headless: false, timeout: 45_000 });
  });

  it('ignoreHTTPSErrors=true でコンテキストが作成される', async () => {
    const mockBrowser = createMockBrowser();
    const launch = vi.fn(async () => mockBrowser);
    const factory = new ChromiumBrowserFactory({
      ignoreHTTPSErrors: true,
      chromiumInstance: { launch },
    });

    await factory.launch();

    expect(mockBrowser.newContext).toHaveBeenCalledWith({ ignoreHTTPSErrors: true });
  });

  it('close でコンテキストとブラウザ両方がクローズされる', async () => {
    const mockBrowser = createMockBrowser();
    const launch = vi.fn(async () => mockBrowser);
    const factory = new ChromiumBrowserFactory({
      chromiumInstance: { launch },
    });

    const launched = await factory.launch();
    await launched.close();

    expect(mockBrowser._mockContext.close).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});

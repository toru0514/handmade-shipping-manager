import { describe, expect, it, vi } from 'vitest';
import type { PlaywrightBrowserFactory } from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type { YamatoBrowserFactory } from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';
import { BrowserlessBrowserFactory } from '../BrowserlessBrowserFactory';

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

describe('BrowserlessBrowserFactory', () => {
  it('PlaywrightBrowserFactory / YamatoBrowserFactory として利用できる', () => {
    const connectOverCDP = vi.fn(async () => createMockBrowser());
    const factory = new BrowserlessBrowserFactory({
      wsEndpoint: 'ws://localhost:3000',
      chromiumInstance: { connectOverCDP },
    });

    const clickPostFactory: PlaywrightBrowserFactory = factory;
    const yamatoFactory: YamatoBrowserFactory = factory;

    expect(clickPostFactory).toBeDefined();
    expect(yamatoFactory).toBeDefined();
  });

  it('wsEndpoint に connectOverCDP で接続する', async () => {
    const mockBrowser = createMockBrowser();
    const connectOverCDP = vi.fn(async () => mockBrowser);
    const factory = new BrowserlessBrowserFactory({
      wsEndpoint: 'ws://localhost:3000',
      chromiumInstance: { connectOverCDP },
    });

    const launched = await factory.launch();

    expect(connectOverCDP).toHaveBeenCalledWith('ws://localhost:3000');
    expect(launched.newPage).toBeDefined();
    expect(launched.close).toBeDefined();
    await launched.newPage();
    expect(mockBrowser._mockContext.newPage).toHaveBeenCalled();
  });

  it('Browserless Cloud の URL でも動作する', async () => {
    const mockBrowser = createMockBrowser();
    const connectOverCDP = vi.fn(async () => mockBrowser);
    const factory = new BrowserlessBrowserFactory({
      wsEndpoint: 'wss://production-sfo.browserless.io?token=my-token',
      chromiumInstance: { connectOverCDP },
    });

    await factory.launch();

    expect(connectOverCDP).toHaveBeenCalledWith(
      'wss://production-sfo.browserless.io?token=my-token',
    );
  });

  it('ignoreHTTPSErrors=true でコンテキストが作成される', async () => {
    const mockBrowser = createMockBrowser();
    const connectOverCDP = vi.fn(async () => mockBrowser);
    const factory = new BrowserlessBrowserFactory({
      wsEndpoint: 'ws://localhost:3000',
      ignoreHTTPSErrors: true,
      chromiumInstance: { connectOverCDP },
    });

    await factory.launch();

    expect(mockBrowser.newContext).toHaveBeenCalledWith({ ignoreHTTPSErrors: true });
  });

  it('デフォルトでは ignoreHTTPSErrors=false', async () => {
    const mockBrowser = createMockBrowser();
    const connectOverCDP = vi.fn(async () => mockBrowser);
    const factory = new BrowserlessBrowserFactory({
      wsEndpoint: 'ws://localhost:3000',
      chromiumInstance: { connectOverCDP },
    });

    await factory.launch();

    expect(mockBrowser.newContext).toHaveBeenCalledWith({ ignoreHTTPSErrors: false });
  });

  it('close でコンテキストとブラウザ両方がクローズされる', async () => {
    const mockBrowser = createMockBrowser();
    const connectOverCDP = vi.fn(async () => mockBrowser);
    const factory = new BrowserlessBrowserFactory({
      wsEndpoint: 'ws://localhost:3000',
      chromiumInstance: { connectOverCDP },
    });

    const launched = await factory.launch();
    await launched.close();

    expect(mockBrowser._mockContext.close).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});

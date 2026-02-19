import { describe, expect, it, vi } from 'vitest';
import type { PlaywrightBrowserFactory } from '@/infrastructure/adapters/shipping/ClickPostAdapter';
import type { YamatoBrowserFactory } from '@/infrastructure/adapters/shipping/YamatoCompactAdapter';
import { ChromiumBrowserFactory } from '../ChromiumBrowserFactory';

describe('ChromiumBrowserFactory', () => {
  it('PlaywrightBrowserFactory / YamatoBrowserFactory として利用できる', () => {
    const launch = vi.fn(async () => ({
      newPage: vi.fn(async () => ({
        goto: vi.fn(async () => undefined),
        fill: vi.fn(async () => undefined),
        click: vi.fn(async () => undefined),
        waitForEvent: vi.fn(async () => ({ createReadStream: vi.fn(async () => null) })),
        textContent: vi.fn(async () => null),
      })),
      close: vi.fn(async () => undefined),
    }));
    const factory = new ChromiumBrowserFactory({
      chromiumInstance: { launch },
    });

    const clickPostFactory: PlaywrightBrowserFactory = factory;
    const yamatoFactory: YamatoBrowserFactory = factory;

    expect(clickPostFactory).toBeDefined();
    expect(yamatoFactory).toBeDefined();
  });

  it('デフォルトは headless=true で launch する', async () => {
    const browser = {
      newPage: vi.fn(async () => ({
        goto: vi.fn(async () => undefined),
        fill: vi.fn(async () => undefined),
        click: vi.fn(async () => undefined),
        waitForEvent: vi.fn(async () => ({ createReadStream: vi.fn(async () => null) })),
        textContent: vi.fn(async () => null),
      })),
      close: vi.fn(async () => undefined),
    };
    const launch = vi.fn(async () => browser);
    const factory = new ChromiumBrowserFactory({
      chromiumInstance: { launch },
    });

    const launched = await factory.launch();

    expect(launch).toHaveBeenCalledWith({ headless: true, timeout: undefined });
    expect(launched).toBe(browser);
  });

  it('headless/headful と timeout を指定できる', async () => {
    const launch = vi.fn(async () => ({
      newPage: vi.fn(async () => ({
        goto: vi.fn(async () => undefined),
        fill: vi.fn(async () => undefined),
        click: vi.fn(async () => undefined),
        waitForEvent: vi.fn(async () => ({ createReadStream: vi.fn(async () => null) })),
        textContent: vi.fn(async () => null),
      })),
      close: vi.fn(async () => undefined),
    }));
    const factory = new ChromiumBrowserFactory({
      headless: false,
      timeoutMs: 45_000,
      chromiumInstance: { launch },
    });

    await factory.launch();

    expect(launch).toHaveBeenCalledWith({ headless: false, timeout: 45_000 });
  });
});

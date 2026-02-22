import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { OrderFetcher } from '@/domain/ports/OrderFetcher';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';
import { MinneAdapter, MinneBrowserFactory } from '../MinneAdapter';

function createTextContentMock(values: Record<string, string>) {
  return vi.fn(async (selector: string) => values[selector] ?? null);
}

describe('MinneAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('OrderFetcher を実装し、minne 注文情報を PlatformOrderData として返す', async () => {
    const fill = vi.fn(async () => undefined);
    const click = vi.fn(async () => undefined);
    const goto = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    const textContent = createTextContentMock({
      '.buyer-name': '山田 花子',
      '.shipping-postal-code': '150-0001',
      '.shipping-prefecture': '東京都',
      '.shipping-city': '渋谷区',
      '.shipping-address-line1': '神宮前1-2-3',
      '.shipping-address-line2': 'サンプルビル101',
      '.shipping-phone': '090-1234-5678',
      '.product-name': 'ハンドメイドピアス',
      '.ordered-at': '2026-02-22T12:34:56.000Z',
    });

    const browserFactory: MinneBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto,
          fill,
          click,
          textContent,
        })),
        close,
      })),
    };

    const adapter = new MinneAdapter({
      browserFactory,
      credentials: {
        email: 'minne@example.com',
        password: 'secret',
      },
    });
    const fetcher: OrderFetcher = adapter;

    const data = await fetcher.fetch(new OrderId('MN-00001'), Platform.Minne);
    expect(data).toEqual({
      orderId: 'MN-00001',
      platform: Platform.Minne,
      buyerName: '山田 花子',
      buyerPostalCode: '1500001',
      buyerPrefecture: '東京都',
      buyerCity: '渋谷区',
      buyerAddress1: '神宮前1-2-3',
      buyerAddress2: 'サンプルビル101',
      buyerPhone: '09012345678',
      productName: 'ハンドメイドピアス',
      orderedAt: new Date('2026-02-22T12:34:56.000Z'),
    });
    expect(goto).toHaveBeenCalledWith('https://minne.com/signin');
    expect(goto).toHaveBeenCalledWith('https://minne.com/orders/MN-00001');
    expect(fill).toHaveBeenCalledWith('#email', 'minne@example.com');
    expect(fill).toHaveBeenCalledWith('#password', 'secret');
    expect(click).toHaveBeenCalledWith('button[type="submit"]');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('OrderFactory.createFromPlatformData で Order に変換できる', async () => {
    const textContent = createTextContentMock({
      '.buyer-name': '山田 花子',
      '.shipping-postal-code': '150-0001',
      '.shipping-prefecture': '東京都',
      '.shipping-city': '渋谷区',
      '.shipping-address-line1': '神宮前1-2-3',
      '.product-name': 'ハンドメイドピアス',
      '.ordered-at': '2026-02-22T12:34:56.000Z',
    });
    const browserFactory: MinneBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto: vi.fn(async () => undefined),
          fill: vi.fn(async () => undefined),
          click: vi.fn(async () => undefined),
          textContent,
        })),
        close: vi.fn(async () => undefined),
      })),
    };
    const adapter = new MinneAdapter({
      browserFactory,
      credentials: { email: 'minne@example.com', password: 'secret' },
    });

    const raw = await adapter.fetch(new OrderId('MN-00002'), Platform.Minne);
    const order = new OrderFactory().createFromPlatformData(raw);

    expect(order.orderId.toString()).toBe('MN-00002');
    expect(order.platform.toString()).toBe('minne');
    expect(order.buyer.name.toString()).toBe('山田 花子');
    expect(order.product.name).toBe('ハンドメイドピアス');
  });

  it('minne 以外の platform 指定はエラー', async () => {
    const browserFactory: MinneBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(),
        close: vi.fn(async () => undefined),
      })),
    };
    const adapter = new MinneAdapter({
      browserFactory,
      credentials: { email: 'minne@example.com', password: 'secret' },
    });

    await expect(adapter.fetch(new OrderId('CR-00001'), Platform.Creema)).rejects.toThrow(
      'MinneAdapter は minne 専用です: creema',
    );
    expect(browserFactory.launch).not.toHaveBeenCalled();
  });
});

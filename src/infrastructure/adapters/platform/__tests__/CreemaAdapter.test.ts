import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { OrderFetcher } from '@/domain/ports/OrderFetcher';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';
import { CreemaAdapter, CreemaBrowserFactory } from '../CreemaAdapter';

function createTextContentMock(values: Record<string, string>) {
  return vi.fn(async (selector: string) => values[selector] ?? null);
}

describe('CreemaAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('OrderFetcher を実装し、creema 注文情報を PlatformOrderData として返す', async () => {
    const fill = vi.fn(async () => undefined);
    const click = vi.fn(async () => undefined);
    const goto = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    const textContent = createTextContentMock({
      '.buyer-name': '佐藤 愛',
      '.shipping-postal-code': '530-0001',
      '.shipping-prefecture': '大阪府',
      '.shipping-city': '大阪市北区',
      '.shipping-address-line1': '梅田1-1-1',
      '.shipping-address-line2': 'サンプルマンション202',
      '.shipping-phone': '080-9876-5432',
      '.product-name': 'ハンドメイドバッグ',
      '.ordered-at': '2026-02-25T10:00:00.000Z',
    });

    const browserFactory: CreemaBrowserFactory = {
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

    const adapter = new CreemaAdapter({
      browserFactory,
      credentials: {
        email: 'creema@example.com',
        password: 'secret',
      },
    });
    const fetcher: OrderFetcher = adapter;

    const data = await fetcher.fetch(new OrderId('CR-10001'), Platform.Creema);
    expect(data).toEqual({
      orderId: 'CR-10001',
      platform: Platform.Creema,
      buyerName: '佐藤 愛',
      buyerPostalCode: '5300001',
      buyerPrefecture: '大阪府',
      buyerCity: '大阪市北区',
      buyerAddress1: '梅田1-1-1',
      buyerAddress2: 'サンプルマンション202',
      buyerPhone: '08098765432',
      productName: 'ハンドメイドバッグ',
      orderedAt: new Date('2026-02-25T10:00:00.000Z'),
    });
    expect(goto).toHaveBeenCalledWith('https://www.creema.jp/login');
    expect(goto).toHaveBeenCalledWith('https://www.creema.jp/member/orders/CR-10001');
    expect(fill).toHaveBeenCalledWith('#email', 'creema@example.com');
    expect(fill).toHaveBeenCalledWith('#password', 'secret');
    expect(click).toHaveBeenCalledWith('button[type="submit"]');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('OrderFactory.createFromPlatformData で Order に変換できる', async () => {
    const textContent = createTextContentMock({
      '.buyer-name': '佐藤 愛',
      '.shipping-postal-code': '530-0001',
      '.shipping-prefecture': '大阪府',
      '.shipping-city': '大阪市北区',
      '.shipping-address-line1': '梅田1-1-1',
      '.product-name': 'ハンドメイドバッグ',
      '.ordered-at': '2026-02-25T10:00:00.000Z',
    });
    const browserFactory: CreemaBrowserFactory = {
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
    const adapter = new CreemaAdapter({
      browserFactory,
      credentials: { email: 'creema@example.com', password: 'secret' },
    });

    const raw = await adapter.fetch(new OrderId('CR-10002'), Platform.Creema);
    const order = new OrderFactory().createFromPlatformData(raw);

    expect(order.orderId.toString()).toBe('CR-10002');
    expect(order.platform.toString()).toBe('creema');
    expect(order.buyer.name.toString()).toBe('佐藤 愛');
    expect(order.product.name).toBe('ハンドメイドバッグ');
  });

  it('creema 以外の platform 指定はエラー', async () => {
    const browserFactory: CreemaBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(),
        close: vi.fn(async () => undefined),
      })),
    };
    const adapter = new CreemaAdapter({
      browserFactory,
      credentials: { email: 'creema@example.com', password: 'secret' },
    });

    await expect(adapter.fetch(new OrderId('MN-00001'), Platform.Minne)).rejects.toThrow(
      'CreemaAdapter は creema 専用です: minne',
    );
    expect(browserFactory.launch).not.toHaveBeenCalled();
  });
});

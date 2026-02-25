import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { OrderFetcher } from '@/domain/ports/OrderFetcher';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';
import { MinneAdapter, MinneBrowserFactory } from '../MinneAdapter';

/**
 * 実際の minne 注文詳細ページ配送先ブロックの innerText 形式
 * （<br> が \n に変換されたもの）
 */
const DELIVERY_BLOCK_TEXT =
  '〒150-0001\n東京都渋谷区神宮前1-2-3\n山田 花子\nTEL：09012345678';

/**
 * セレクタごとのモック値マップ。
 * resolvedSelectors に含まれるものは "DOM に存在する" とみなす。
 */
function createPageMock() {
  const resolvedSelectors = new Set([
    // sendLoginLink で使うセレクタ
    'input[type="email"]',
    'button:has-text("ログインリンクを送信")',
    // fetchOrderData で使うセレクタ
    'h3:has-text("配送先情報") + .p-content-section__body > div',
    '.p-order-product__name a',
    'dt:has-text("注文日") + dd',
  ]);

  const waitForSelector = vi.fn(async (selector: string) => {
    if (!resolvedSelectors.has(selector)) {
      throw new Error(`Selector not found in mock: ${selector}`);
    }
    return null;
  });

  // innerText は <br> → \n 変換済みのテキストを返す（配送先ブロック）
  const innerText = vi.fn(async (selector: string) => {
    if (selector === 'h3:has-text("配送先情報") + .p-content-section__body > div') {
      return DELIVERY_BLOCK_TEXT;
    }
    return '';
  });

  const textContent = vi.fn(async (selector: string) => {
    const values: Record<string, string> = {
      '.p-order-product__name a': 'ハンドメイドピアス',
      'dt:has-text("注文日") + dd': '2026/02/22',
    };
    return values[selector] ?? null;
  });

  return {
    goto: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    textContent,
    innerText,
    waitForSelector,
    waitForLoadState: vi.fn(async () => undefined),
  };
}

describe('MinneAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('OrderFetcher を実装し、minne 注文情報を PlatformOrderData として返す', async () => {
    const page = createPageMock();
    const close = vi.fn(async () => undefined);
    const browserFactory: MinneBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => page),
        close,
      })),
    };
    const getLoginUrl = vi.fn(
      async () => 'https://minne.com/users/sign_in/magic_link/token123',
    );

    const adapter = new MinneAdapter({
      browserFactory,
      email: 'minne@example.com',
      getLoginUrl,
    });
    const fetcher: OrderFetcher = adapter;

    const data = await fetcher.fetch(new OrderId('MN-00001'), Platform.Minne);

    // 購入者情報の検証
    expect(data.orderId).toBe('MN-00001');
    expect(data.platform).toBe(Platform.Minne);
    expect(data.buyerName).toBe('山田 花子');
    expect(data.buyerPostalCode).toBe('1500001');
    expect(data.buyerPrefecture).toBe('東京都');
    expect(data.buyerCity).toBe('渋谷区');
    expect(data.buyerAddress1).toBe('神宮前1-2-3');
    expect(data.buyerAddress2).toBeUndefined();
    expect(data.buyerPhone).toBe('09012345678');
    expect(data.productName).toBe('ハンドメイドピアス');

    // ログインフローの確認
    expect(page.goto).toHaveBeenCalledWith('https://minne.com/users/sign_in');
    expect(page.fill).toHaveBeenCalledWith('input[type="email"]', 'minne@example.com');
    expect(page.click).toHaveBeenCalledWith('button:has-text("ログインリンクを送信")');
    expect(getLoginUrl).toHaveBeenCalledWith('minne@example.com');
    expect(page.goto).toHaveBeenCalledWith(
      'https://minne.com/users/sign_in/magic_link/token123',
    );
    expect(page.goto).toHaveBeenCalledWith('https://minne.com/account/orders/MN-00001');

    // ブラウザが閉じられることを確認
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('OrderFactory.createFromPlatformData で Order に変換できる', async () => {
    const page = createPageMock();
    const browserFactory: MinneBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => page),
        close: vi.fn(async () => undefined),
      })),
    };

    const adapter = new MinneAdapter({
      browserFactory,
      email: 'minne@example.com',
      getLoginUrl: async () => 'https://minne.com/users/sign_in/magic_link/token',
    });

    const raw = await adapter.fetch(new OrderId('MN-00002'), Platform.Minne);
    const order = new OrderFactory().createFromPlatformData(raw);

    expect(order.orderId.toString()).toBe('MN-00002');
    expect(order.platform.toString()).toBe('minne');
    expect(order.buyer.name.toString()).toBe('山田 花子');
    expect(order.product.name).toBe('ハンドメイドピアス');
  });

  it('エラー発生時もブラウザが必ず close される', async () => {
    const close = vi.fn(async () => undefined);
    const browserFactory: MinneBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => {
          throw new Error('ページ生成に失敗');
        }),
        close,
      })),
    };

    const adapter = new MinneAdapter({
      browserFactory,
      email: 'minne@example.com',
      getLoginUrl: async () => 'https://minne.com/users/sign_in/magic_link/token',
    });

    await expect(adapter.fetch(new OrderId('MN-00001'), Platform.Minne)).rejects.toThrow(
      'minne注文情報の取得に失敗しました',
    );
    expect(close).toHaveBeenCalledTimes(1);
  });
});

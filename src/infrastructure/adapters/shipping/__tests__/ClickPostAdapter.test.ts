import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { Platform } from '@/domain/valueObjects/Platform';
import { ClickPostAdapter, PlaywrightBrowserFactory } from '../ClickPostAdapter';
import { ClickPostGateway } from '../ClickPostGateway';

const orderFactory = new OrderFactory();

function createOrder(): Order {
  return orderFactory.createFromPlatformData({
    orderId: 'ORD-001',
    platform: Platform.Minne,
    buyerName: '山田 太郎',
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    buyerPhone: '09012345678',
    productName: 'ハンドメイドアクセサリー',
    price: 2500,
    orderedAt: new Date('2026-03-01T00:00:00.000Z'),
  });
}

describe('ClickPostAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ClickPostGateway を実装し、PDFと追跡番号から ClickPostLabel を返す', async () => {
    const goto = vi.fn(async () => undefined);
    const fill = vi.fn(async () => undefined);
    const click = vi.fn(async () => undefined);
    const waitForEvent = vi.fn(async () => ({
      createReadStream: vi.fn(async () => Readable.from([Buffer.from('dummy-pdf')])),
    }));
    const textContent = vi.fn(async () => 'CP123456789JP');
    const close = vi.fn(async () => undefined);
    const browserFactory: PlaywrightBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto,
          fill,
          click,
          waitForEvent,
          textContent,
        })),
        close,
      })),
    };

    const adapter = new ClickPostAdapter({
      browserFactory,
      credentials: {
        email: 'test@example.com',
        password: 'secret',
      },
      now: () => new Date('2026-03-02T00:00:00.000Z'),
      createLabelId: () => 'LBL-CP-001',
    });
    const gateway: ClickPostGateway = adapter;

    const result = await gateway.issue(createOrder());

    expect(result.labelId.toString()).toBe('LBL-CP-001');
    expect(result.orderId.toString()).toBe('ORD-001');
    expect(result.pdfData).toBe(Buffer.from('dummy-pdf').toString('base64'));
    expect(result.trackingNumber.toString()).toBe('CP123456789JP');
    expect(result.issuedAt.toISOString()).toBe('2026-03-02T00:00:00.000Z');

    expect(browserFactory.launch).toHaveBeenCalledTimes(1);
    expect(goto).toHaveBeenCalledWith('https://clickpost.jp/');
    expect(fill).toHaveBeenCalledWith('#email', 'test@example.com');
    expect(fill).toHaveBeenCalledWith('#password', 'secret');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('エラー時は文脈付きメッセージを投げ、browser.close を呼ぶ', async () => {
    const close = vi.fn(async () => undefined);
    const browserFactory: PlaywrightBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto: vi.fn(async () => undefined),
          fill: vi.fn(async () => undefined),
          click: vi.fn(async () => undefined),
          waitForEvent: vi.fn(async () => ({
            createReadStream: vi.fn(async () => null),
          })),
          textContent: vi.fn(async () => null),
        })),
        close,
      })),
    };
    const adapter = new ClickPostAdapter({
      browserFactory,
      credentials: {
        email: 'test@example.com',
        password: 'secret',
      },
    });

    await expect(adapter.issue(createOrder())).rejects.toThrow(
      'クリックポスト伝票の発行に失敗しました',
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('PDFストリームが空の場合はエラーになる', async () => {
    const close = vi.fn(async () => undefined);
    const browserFactory: PlaywrightBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto: vi.fn(async () => undefined),
          fill: vi.fn(async () => undefined),
          click: vi.fn(async () => undefined),
          waitForEvent: vi.fn(async () => ({
            createReadStream: vi.fn(async () => Readable.from([])),
          })),
          textContent: vi.fn(async () => 'CP123456789JP'),
        })),
        close,
      })),
    };
    const adapter = new ClickPostAdapter({
      browserFactory,
      credentials: {
        email: 'test@example.com',
        password: 'secret',
      },
    });

    await expect(adapter.issue(createOrder())).rejects.toThrow(
      'クリックポスト伝票の発行に失敗しました: PDFデータが空です',
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('browser.close が失敗しても元のエラーを優先し、警告ログを出す', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const closeError = new Error('close failed');
    const browserFactory: PlaywrightBrowserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto: vi.fn(async () => undefined),
          fill: vi.fn(async () => undefined),
          click: vi.fn(async () => undefined),
          waitForEvent: vi.fn(async () => ({
            createReadStream: vi.fn(async () => null),
          })),
          textContent: vi.fn(async () => null),
        })),
        close: vi.fn(async () => {
          throw closeError;
        }),
      })),
    };
    const adapter = new ClickPostAdapter({
      browserFactory,
      credentials: {
        email: 'test@example.com',
        password: 'secret',
      },
    });

    await expect(adapter.issue(createOrder())).rejects.toThrow(
      'クリックポスト伝票の発行に失敗しました: PDFストリームを取得できませんでした',
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('browser.close に失敗しました');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { Platform } from '@/domain/valueObjects/Platform';
import { YamatoCompactAdapter } from '../YamatoCompactAdapter';
import { YamatoCompactGateway } from '../YamatoCompactGateway';

const orderFactory = new OrderFactory();

function createOrder(): Order {
  return orderFactory.createFromPlatformData({
    orderId: 'ORD-002',
    platform: Platform.Minne,
    buyerName: '山田 花子',
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    buyerPhone: '09012345678',
    productName: 'ハンドメイドポーチ',
    price: 3000,
    orderedAt: new Date('2026-03-10T00:00:00.000Z'),
  });
}

describe('YamatoCompactAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('YamatoCompactGateway を実装し、QRコードと送り状番号から YamatoCompactLabel を返す', async () => {
    const goto = vi.fn(async () => undefined);
    const fill = vi.fn(async () => undefined);
    const click = vi.fn(async () => undefined);
    const textContent = vi.fn(async (selector: string) => {
      if (selector === '#qr-code-data') return 'YAMATO-QR-DATA';
      if (selector === '#waybill-number') return 'YMT-1234-5678';
      return null;
    });
    const close = vi.fn(async () => undefined);
    const browserFactory = {
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
    const adapter = new YamatoCompactAdapter({
      browserFactory,
      credentials: {
        memberId: 'yamato-id',
        password: 'secret',
      },
      now: () => new Date('2026-03-11T00:00:00.000Z'),
      createLabelId: () => 'LBL-YM-001',
    });
    const gateway: YamatoCompactGateway = adapter;

    const result = await gateway.issue(createOrder());

    expect(result.labelId.toString()).toBe('LBL-YM-001');
    expect(result.orderId.toString()).toBe('ORD-002');
    expect(result.qrCode).toBe('YAMATO-QR-DATA');
    expect(result.waybillNumber).toBe('YMT-1234-5678');
    expect(result.issuedAt.toISOString()).toBe('2026-03-11T00:00:00.000Z');
    expect(result.expiresAt?.toISOString()).toBe('2026-03-25T00:00:00.000Z');

    expect(goto).toHaveBeenNthCalledWith(1, 'https://auth.kms.kuronekoyamato.co.jp/auth/login');
    expect(goto).toHaveBeenNthCalledWith(2, 'https://member.kms.kuronekoyamato.co.jp/member');
    expect(fill).toHaveBeenCalledWith('#login-form-id', 'yamato-id');
    expect(fill).toHaveBeenCalledWith('#login-form-password', 'secret');
    expect(click).toHaveBeenCalledWith('#login-form-submit');
    expect(click).toHaveBeenCalledWith('a[href*="_A=OTODOKE"]');
    expect(click).toHaveBeenCalledWith('#button_regist');
    expect(click).toHaveBeenCalledWith('text=送り状を発行');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('エラー時は文脈付きメッセージを投げ、browser.close を呼ぶ', async () => {
    const close = vi.fn(async () => undefined);
    const browserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto: vi.fn(async () => undefined),
          fill: vi.fn(async () => undefined),
          click: vi.fn(async () => undefined),
          textContent: vi.fn(async () => null),
        })),
        close,
      })),
    };
    const adapter = new YamatoCompactAdapter({
      browserFactory,
      credentials: {
        memberId: 'yamato-id',
        password: 'secret',
      },
    });

    await expect(adapter.issue(createOrder())).rejects.toThrow(
      '宅急便コンパクト伝票の発行に失敗しました',
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('browser.close が失敗しても元のエラーを優先し、警告ログを出す', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const browserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => ({
          goto: vi.fn(async () => undefined),
          fill: vi.fn(async () => undefined),
          click: vi.fn(async () => undefined),
          textContent: vi.fn(async () => null),
        })),
        close: vi.fn(async () => {
          throw new Error('close failed');
        }),
      })),
    };
    const adapter = new YamatoCompactAdapter({
      browserFactory,
      credentials: {
        memberId: 'yamato-id',
        password: 'secret',
      },
    });

    await expect(adapter.issue(createOrder())).rejects.toThrow(
      '宅急便コンパクト伝票の発行に失敗しました: QRコードを取得できませんでした',
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('browser.close に失敗しました');
  });
});

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

function createOrderWithoutSpace(): Order {
  return orderFactory.createFromPlatformData({
    orderId: 'ORD-003',
    platform: Platform.Minne,
    buyerName: '山田花子',
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

function createPage(options?: {
  availableSelectors?: string[];
  textBySelector?: Record<string, string | null>;
}) {
  const available = new Set(
    options?.availableSelectors ?? [
      '#login-form-id',
      '#login-form-password',
      '#login-form-submit',
      'a[href*="_A=OTODOKE"]',
      '#button_regist',
      '#lastNmCenter',
      '#firstNmCenter',
      '#zipCd',
      '#address1Center',
      '#address2Center',
      '#address3Center',
      '#address4Center',
      '#telCenter',
      '#NEXT_BTN',
      '#qr-code-data',
      '#waybill-number',
    ],
  );
  const textBySelector = options?.textBySelector ?? {
    '#qr-code-data': 'YAMATO-QR-DATA',
    '#waybill-number': 'YMT-1234-5678',
  };

  const goto = vi.fn(async () => undefined);
  const fill = vi.fn(async () => undefined);
  const click = vi.fn(async () => undefined);
  const waitForLoadState = vi.fn(async () => undefined);
  const waitForSelector = vi.fn(async (selector: string) => {
    if (available.has(selector)) {
      return {};
    }
    throw new Error(`not found: ${selector}`);
  });
  const textContent = vi.fn(async (selector: string) => textBySelector[selector] ?? null);

  return {
    page: {
      goto,
      fill,
      click,
      waitForLoadState,
      waitForSelector,
      textContent,
    },
    spies: {
      goto,
      fill,
      click,
      waitForLoadState,
      waitForSelector,
      textContent,
    },
  };
}

describe('YamatoCompactAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('YamatoCompactGateway を実装し、QRコードと送り状番号から YamatoCompactLabel を返す', async () => {
    const { page, spies } = createPage();
    const close = vi.fn(async () => undefined);
    const browserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => page),
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

    expect(spies.goto).toHaveBeenNthCalledWith(
      1,
      'https://auth.kms.kuronekoyamato.co.jp/auth/login',
    );
    expect(spies.goto).toHaveBeenNthCalledWith(2, 'https://member.kms.kuronekoyamato.co.jp/member');
    expect(spies.fill).toHaveBeenCalledWith('#login-form-id', 'yamato-id');
    expect(spies.fill).toHaveBeenCalledWith('#login-form-password', 'secret');
    expect(spies.fill).toHaveBeenCalledWith('#lastNmCenter', '山田');
    expect(spies.fill).toHaveBeenCalledWith('#firstNmCenter', '花子');
    expect(spies.fill).toHaveBeenCalledWith('#zipCd', '1500001');
    expect(spies.fill).toHaveBeenCalledWith('#address1Center', '東京都');
    expect(spies.fill).toHaveBeenCalledWith('#address2Center', '渋谷区');
    expect(spies.fill).toHaveBeenCalledWith('#address3Center', '神宮前1-1-1');
    expect(spies.fill).toHaveBeenCalledWith('#telCenter', '09012345678');
    expect(spies.click).toHaveBeenCalledWith('#login-form-submit');
    expect(spies.click).toHaveBeenCalledWith('a[href*="_A=OTODOKE"]');
    expect(spies.click).toHaveBeenCalledWith('#button_regist');
    expect(spies.click).toHaveBeenCalledWith('#NEXT_BTN');
    expect(spies.waitForSelector).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('QR/送り状番号が取得できない場合はフォールバックで成功し、browser.close を呼ぶ', async () => {
    const close = vi.fn(async () => undefined);
    const { page } = createPage({
      textBySelector: {
        '#qr-code-data': null,
        '#waybill-number': null,
      },
    });
    const browserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => page),
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

    const result = await adapter.issue(createOrder());
    expect(result.qrCode).toContain('data:image/png;base64');
    expect(result.waybillNumber).toBe('ADDRESS-BOOK-REGISTERED');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('browser.close が失敗した場合は警告ログを出す', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { page } = createPage({
      textBySelector: {
        '#qr-code-data': null,
        '#waybill-number': null,
      },
    });
    const browserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => page),
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

    const result = await adapter.issue(createOrder());
    expect(result.qrCode).toContain('data:image/png;base64');
    expect(result.waybillNumber).toBe('ADDRESS-BOOK-REGISTERED');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('browser.close に失敗しました');
  });

  it('購入者名がスペース区切りでない場合はエラーを投げる', async () => {
    const close = vi.fn(async () => undefined);
    const { page } = createPage();
    const browserFactory = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => page),
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

    await expect(adapter.issue(createOrderWithoutSpace())).rejects.toThrow(
      '宅急便コンパクト伝票の発行に失敗しました: 購入者名は姓と名をスペース区切りで指定してください: 山田花子',
    );
    expect(close).toHaveBeenCalledTimes(1);
  });
});

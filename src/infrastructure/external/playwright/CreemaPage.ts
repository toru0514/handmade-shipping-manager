import { OrderId } from '@/domain/valueObjects/OrderId';

const CREEMA_LOGIN_URL = 'https://www.creema.jp/login';
const CREEMA_TRADE_LIST_URL = 'https://www.creema.jp/my/tradenavi/list';

const SELECTORS = {
  email: ['#login-email', '#email', 'input[name="email"]', 'input[type="email"]'] as const,
  password: [
    '#login-password',
    '#password',
    'input[name="password"]',
    'input[type="password"]',
  ] as const,
  loginButton: [
    'input.js-user-login-button[value="ログイン"]',
    'input[type="button"][value="ログイン"]',
    'button[type="submit"]',
    'input[type="submit"]',
    'text=ログイン',
  ] as const,
  buyerName: ['.buyer-name', '[data-testid="buyer-name"]', '#buyer-name'] as const,
  postalCode: ['.shipping-postal-code', '[data-testid="postal-code"]', '#postal-code'] as const,
  prefecture: ['.shipping-prefecture', '[data-testid="prefecture"]', '#prefecture'] as const,
  city: ['.shipping-city', '[data-testid="city"]', '#city'] as const,
  address1: ['.shipping-address-line1', '[data-testid="address1"]', '#address1'] as const,
  address2: ['.shipping-address-line2', '[data-testid="address2"]', '#address2'] as const,
  phone: ['.shipping-phone', '[data-testid="phone"]', '#phone'] as const,
  productName: [
    '.product-name',
    '[data-testid="product-name"]',
    '#product-name',
    '#trade .p-tradenavi-price-table__name',
  ] as const,
  orderedAt: [
    '.ordered-at',
    '[data-testid="ordered-at"]',
    '#ordered-at',
    '.p-tradenavi-status__timestamp',
  ] as const,
} as const;

export interface CreemaCredentials {
  readonly email: string;
  readonly password: string;
}

export interface CreemaPageLike {
  goto(
    url: string,
    options?: { timeout?: number; waitUntil?: 'domcontentloaded' | 'load' | 'networkidle' },
  ): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string, options?: { timeout?: number }): Promise<void>;
  textContent(selector: string, options?: { timeout?: number }): Promise<string | null>;
  evaluate<R, Arg>(pageFunction: (arg: Arg) => R, arg: Arg): Promise<R>;
}

export interface CreemaScrapedOrderData {
  readonly buyerName: string;
  readonly buyerPostalCode: string;
  readonly buyerPrefecture: string;
  readonly buyerCity: string;
  readonly buyerAddress1: string;
  readonly buyerAddress2?: string;
  readonly buyerPhone?: string;
  readonly productName: string;
  readonly orderedAt: Date;
}

export class CreemaPage {
  private readonly debugEnabled =
    process.env['CREEMA_DEBUG']?.trim().toLowerCase() === 'true' ||
    process.env['CREEMA_DEBUG']?.trim() === '1';

  private tradeListSummary?: {
    readonly buyerName?: string;
    readonly productName?: string;
    readonly orderedAtText?: string;
  };

  constructor(private readonly page: CreemaPageLike) {}

  async fetchOrder(
    orderId: OrderId,
    credentials: CreemaCredentials,
  ): Promise<CreemaScrapedOrderData> {
    this.debug(`fetchOrder start orderId=${orderId.toString()}`);
    await this.login(credentials);
    await this.openOrder(orderId);
    const scraped = await this.scrapeOrder();
    this.debug(`fetchOrder done orderId=${orderId.toString()}`);
    return scraped;
  }

  private async login(credentials: CreemaCredentials): Promise<void> {
    this.debug('login start');
    await this.safeGoto(CREEMA_LOGIN_URL);

    const emailFilled = await this.fillFirst([...SELECTORS.email], credentials.email);
    if (!emailFilled) {
      throw new Error('creema ログインメール入力欄を検出できませんでした');
    }

    const passwordFilled = await this.fillFirst([...SELECTORS.password], credentials.password);
    if (!passwordFilled) {
      throw new Error('creema ログインパスワード入力欄を検出できませんでした');
    }

    const clicked = await this.clickFirst([...SELECTORS.loginButton]);
    if (!clicked) {
      throw new Error('creema ログインボタンを検出できませんでした');
    }
    this.debug('login submit clicked');
  }

  private async openOrder(orderId: OrderId): Promise<void> {
    this.debug(`openOrder start orderId=${orderId.toString()}`);
    await this.safeGoto(CREEMA_TRADE_LIST_URL);
    this.debug('tradelist opened');

    this.debug('tradelist evaluate start');
    const orderInfo = await this.page.evaluate((targetOrderId) => {
      const spans = Array.from(document.querySelectorAll('span'));
      for (const span of spans) {
        const text = (span.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (!text.includes(`注文ID：${targetOrderId}`)) {
          continue;
        }

        const headerTr = span.closest('tr');
        if (!headerTr) {
          continue;
        }

        const link = headerTr.querySelector<HTMLAnchorElement>('a[href*="/tradenavi/"]');
        const href = link?.getAttribute('href') ?? null;

        const firstDataTr = headerTr.nextElementSibling as HTMLTableRowElement | null;
        const titleAnchor = firstDataTr?.querySelector<HTMLAnchorElement>(
          'a.u-text-deco--none.u-block.u-text-bold',
        );
        const rowSpanTds = firstDataTr
          ? Array.from(firstDataTr.querySelectorAll('td[rowspan]'))
          : [];
        const partnerFullnameEl =
          rowSpanTds[0]?.querySelector<HTMLElement>('.p-my-tradenavi-list-table__fullname') ?? null;
        const partnerFullname = (partnerFullnameEl?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/[（）()]/g, '')
          .replace(/さま宛$/, '')
          .trim();
        const tradeDate = (rowSpanTds[1]?.textContent ?? '').replace(/\s+/g, ' ').trim();

        return {
          tradenaviPath: href,
          buyerName: partnerFullname || null,
          productName: (titleAnchor?.textContent ?? '').replace(/\s+/g, ' ').trim() || null,
          orderedAtText: tradeDate || null,
        };
      }
      return null;
    }, orderId.toString());

    if (!orderInfo?.tradenaviPath) {
      throw new Error(
        `creema 取引一覧で注文IDに紐づく取引ナビを見つけられませんでした: ${orderId.toString()}`,
      );
    }
    this.debug(`tradelist evaluate hit tradenaviPath=${orderInfo.tradenaviPath}`);

    this.tradeListSummary = {
      buyerName: orderInfo.buyerName ?? undefined,
      productName: orderInfo.productName ?? undefined,
      orderedAtText: orderInfo.orderedAtText ?? undefined,
    };

    const tradenaviUrl = new URL(orderInfo.tradenaviPath, 'https://www.creema.jp').toString();
    this.debug(`open tradenavi url=${tradenaviUrl}`);
    await this.safeGoto(tradenaviUrl);
    this.debug('tradenavi opened');
  }

  private async scrapeOrder(): Promise<CreemaScrapedOrderData> {
    this.debug('scrapeOrder start');
    let addressFallbackCache:
      | {
          buyerName?: string;
          buyerPostalCode?: string;
          buyerPrefecture?: string;
          buyerCity?: string;
          buyerAddress1?: string;
          buyerAddress2?: string;
          buyerPhone?: string;
        }
      | undefined;
    const getAddressFallback = async () => {
      if (!addressFallbackCache) {
        addressFallbackCache = await this.extractAddressSectionInfo();
      }
      return addressFallbackCache;
    };

    let buyerName = await this.optionalText([...SELECTORS.buyerName]);
    if (!buyerName) buyerName = (await getAddressFallback()).buyerName;
    if (!buyerName) buyerName = this.tradeListSummary?.buyerName;
    if (!buyerName) {
      throw new Error('creema 注文詳細の購入者名を取得できませんでした');
    }

    let buyerPostalCode = await this.optionalText([...SELECTORS.postalCode]);
    if (!buyerPostalCode) buyerPostalCode = (await getAddressFallback()).buyerPostalCode;
    if (!buyerPostalCode) {
      throw new Error('creema 注文詳細の郵便番号を取得できませんでした');
    }

    let buyerPrefecture = await this.optionalText([...SELECTORS.prefecture]);
    if (!buyerPrefecture) buyerPrefecture = (await getAddressFallback()).buyerPrefecture;
    if (!buyerPrefecture) {
      throw new Error('creema 注文詳細の都道府県を取得できませんでした');
    }

    let buyerCity = await this.optionalText([...SELECTORS.city]);
    if (!buyerCity) buyerCity = (await getAddressFallback()).buyerCity;
    if (!buyerCity) {
      throw new Error('creema 注文詳細の市区町村を取得できませんでした');
    }

    let buyerAddress1 = await this.optionalText([...SELECTORS.address1]);
    if (!buyerAddress1) buyerAddress1 = (await getAddressFallback()).buyerAddress1;
    if (!buyerAddress1) {
      throw new Error('creema 注文詳細の番地を取得できませんでした');
    }

    let buyerAddress2 = await this.optionalText([...SELECTORS.address2]);
    if (!buyerAddress2) buyerAddress2 = (await getAddressFallback()).buyerAddress2;
    let buyerPhone = await this.optionalText([...SELECTORS.phone]);
    if (!buyerPhone) buyerPhone = (await getAddressFallback()).buyerPhone;

    const productName =
      (await this.optionalText([...SELECTORS.productName])) ?? this.tradeListSummary?.productName;
    if (!productName) {
      throw new Error('creema 注文詳細の商品名を取得できませんでした');
    }

    const orderedAtText =
      (await this.optionalText([...SELECTORS.orderedAt])) ?? this.tradeListSummary?.orderedAtText;
    if (!orderedAtText) {
      throw new Error('creema 注文詳細の注文日時を取得できませんでした');
    }

    const orderedAt = this.parseOrderedAt(orderedAtText);
    if (Number.isNaN(orderedAt.getTime())) {
      throw new Error(`注文日時の形式が不正です: ${orderedAtText}`);
    }

    const result = {
      buyerName,
      buyerPostalCode: buyerPostalCode.replace(/[^\d]/g, ''),
      buyerPrefecture,
      buyerCity,
      buyerAddress1,
      buyerAddress2: buyerAddress2 || undefined,
      buyerPhone: buyerPhone?.replace(/[^\d]/g, '') || undefined,
      productName,
      orderedAt,
    };
    this.debug(
      `scrapeOrder done buyer=${result.buyerName} postal=${result.buyerPostalCode} product=${result.productName}`,
    );
    return result;
  }

  private async extractAddressSectionInfo(): Promise<{
    buyerName?: string;
    buyerPostalCode?: string;
    buyerPrefecture?: string;
    buyerCity?: string;
    buyerAddress1?: string;
    buyerAddress2?: string;
    buyerPhone?: string;
  }> {
    this.debug('extractAddressSectionInfo evaluate start');
    const extracted = await this.page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('section#address');
      if (!section) return null;

      const cols = Array.from(
        section.querySelectorAll<HTMLElement>('.p-tradenavi-address-container__col'),
      );
      const buyerCol =
        cols.find((col) =>
          (col.querySelector('.p-tradenavi-address-container__title')?.textContent ?? '').includes(
            '購入者',
          ),
        ) ??
        cols[0] ??
        null;
      if (!buyerCol) return null;

      const rows = Array.from(buyerCol.querySelectorAll<HTMLElement>('.p-tradenavi-address__row'));

      let buyerName: string | null = null;
      let addressLine: string | null = null;
      let phone: string | null = null;

      for (const row of rows) {
        const rowText = (row.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (!rowText) continue;
        if (rowText.includes('ニックネーム')) continue;

        if (rowText.includes('〒')) {
          addressLine = rowText;
          continue;
        }

        const digits = rowText.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 13) {
          phone = rowText;
          continue;
        }

        if (!buyerName) {
          buyerName = rowText;
        }
      }

      return { buyerName, addressLine, phone };
    }, null);

    if (!extracted) {
      this.debug('extractAddressSectionInfo no section');
      return {};
    }

    const postal = extracted.addressLine?.match(/〒?\s*([0-9]{3}-?[0-9]{4})/)?.[1];
    const rawAddress = extracted.addressLine
      ?.replace(/〒?\s*[0-9]{3}-?[0-9]{4}/, '')
      .replace(/\s+/g, ' ')
      .trim();

    const parsed = rawAddress ? this.parseJapaneseAddress(rawAddress) : undefined;

    const parsedResult = {
      buyerName: extracted.buyerName ?? undefined,
      buyerPostalCode: postal ?? undefined,
      buyerPrefecture: parsed?.prefecture,
      buyerCity: parsed?.city,
      buyerAddress1: parsed?.street,
      buyerAddress2: parsed?.building,
      buyerPhone: extracted.phone ?? undefined,
    };
    this.debug(
      `extractAddressSectionInfo done buyer=${parsedResult.buyerName ?? '-'} postal=${parsedResult.buyerPostalCode ?? '-'}`,
    );
    return parsedResult;
  }

  private parseJapaneseAddress(raw: string): {
    prefecture: string;
    city: string;
    street: string;
    building?: string;
  } {
    const normalized = raw.trim();

    const prefMatch = normalized.match(/^(東京都|北海道|(?:大阪|京都)府|.{2,3}県)/);
    if (!prefMatch) {
      return { prefecture: '', city: '', street: normalized };
    }
    const prefecture = prefMatch[1];
    const afterPref = normalized.substring(prefecture.length).trim();

    const cityMatch = afterPref.match(
      /^([^\d０-９\n]+?(?:郡[^\s\n]+?(?:町|村)|市[^\s\n]*?区|市|区|町|村))/,
    );
    if (!cityMatch) {
      return { prefecture, city: '', street: afterPref };
    }
    const city = cityMatch[1];
    const afterCity = afterPref.substring(city.length).trim();

    const spaceIdx = afterCity.search(/\s+/);
    if (spaceIdx === -1) {
      return { prefecture, city, street: afterCity };
    }

    const street = afterCity.substring(0, spaceIdx).trim();
    const building = afterCity.substring(spaceIdx).trim() || undefined;
    return { prefecture, city, street, building };
  }

  private parseOrderedAt(value: string): Date {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }

    const m = value.match(
      /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
    );
    if (!m) {
      return new Date(NaN);
    }

    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const hour = Number(m[4] ?? '0');
    const minute = Number(m[5] ?? '0');
    const second = Number(m[6] ?? '0');
    return new Date(year, month, day, hour, minute, second);
  }

  private async fillFirst(selectors: string[], value: string): Promise<boolean> {
    for (const selector of selectors) {
      try {
        await this.page.fill(selector, value);
        return true;
      } catch {
        // try next selector
      }
    }
    return false;
  }

  private async clickFirst(selectors: string[]): Promise<boolean> {
    for (const selector of selectors) {
      try {
        await this.page.click(selector);
        return true;
      } catch {
        // try next selector
      }
    }
    return false;
  }

  private async optionalText(selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        // セレクタ未存在時の長時間待機を避ける（フォールバックへ速やかに進む）
        const text = await this.page.textContent(selector, { timeout: 800 });
        const normalized = text?.trim();
        if (normalized) {
          return normalized;
        }
      } catch {
        // try next selector
      }
    }
    return null;
  }

  private async safeGoto(url: string): Promise<void> {
    this.debug(`goto start url=${url}`);
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      this.debug(`goto ok url=${url}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('ERR_ABORTED')) {
        this.debug(`goto error url=${url} message=${message}`);
        throw error;
      }
      this.debug(`goto aborted retry url=${url}`);
      await sleepMs(1000);
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      this.debug(`goto retry ok url=${url}`);
    }
  }

  private debug(message: string): void {
    if (!this.debugEnabled) return;
    console.log(`[CreemaPage] ${message}`);
  }
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

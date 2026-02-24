import { OrderId } from '@/domain/valueObjects/OrderId';

const MINNE_LOGIN_URL = 'https://minne.com/signin';
const MINNE_ACCOUNT_URL = 'https://minne.com/account';
const MINNE_ORDERS_URL = 'https://minne.com/account/orders';

const SELECTORS = {
  email: ['#email', 'input[name="email"]', 'input[type="email"]'] as const,
  password: ['#password', 'input[name="password"]', 'input[type="password"]'] as const,
  loginLinkButton: [
    'text=ログインリンクを送信',
    'button:has-text("ログインリンクを送信")',
  ] as const,
  loginButton: ['button[type="submit"]', 'input[type="submit"]', 'text=ログイン'] as const,
  ordersNav: ['#sidenav_orders', 'a[href="/account/orders"]', 'text=売れたもの'] as const,
  buyerName: ['.buyer-name', '[data-testid="buyer-name"]', '#buyer-name'] as const,
  postalCode: ['.shipping-postal-code', '[data-testid="postal-code"]', '#postal-code'] as const,
  prefecture: ['.shipping-prefecture', '[data-testid="prefecture"]', '#prefecture'] as const,
  city: ['.shipping-city', '[data-testid="city"]', '#city'] as const,
  address1: ['.shipping-address-line1', '[data-testid="address1"]', '#address1'] as const,
  address2: ['.shipping-address-line2', '[data-testid="address2"]', '#address2'] as const,
  phone: ['.shipping-phone', '[data-testid="phone"]', '#phone'] as const,
  productName: ['.product-name', '[data-testid="product-name"]', '#product-name'] as const,
  orderedAt: ['.ordered-at', '[data-testid="ordered-at"]', '#ordered-at'] as const,
} as const;

export interface MinneCredentials {
  readonly email: string;
  readonly password?: string;
  readonly manualLoginWaitMs?: number;
}

export interface MinnePageLike {
  goto(url: string, options?: { timeout?: number }): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string, options?: { timeout?: number }): Promise<void>;
  textContent(selector: string): Promise<string | null>;
}

export interface MinneScrapedOrderData {
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

export class MinnePage {
  constructor(private readonly page: MinnePageLike) {}

  async fetchOrder(
    orderId: OrderId,
    credentials: MinneCredentials,
  ): Promise<MinneScrapedOrderData> {
    await this.login(credentials);
    await this.openOrder(orderId);
    return this.scrapeOrder(orderId);
  }

  private async login(credentials: MinneCredentials): Promise<void> {
    await this.page.goto(MINNE_LOGIN_URL);

    const emailFilled = await this.fillFirst([...SELECTORS.email], credentials.email);
    if (!emailFilled) {
      throw new Error('minne ログインメール入力欄を検出できませんでした');
    }

    const password = credentials.password?.trim();
    if (password) {
      const passwordFilled = await this.fillFirst([...SELECTORS.password], password);
      if (passwordFilled) {
        const clicked = await this.clickFirst([...SELECTORS.loginButton]);
        if (!clicked) {
          throw new Error('minne ログインボタンを検出できませんでした');
        }
        return;
      }
    }

    const linkSent = await this.clickFirst([...SELECTORS.loginLinkButton]);
    if (linkSent) {
      const manualLoginWaitMs = credentials.manualLoginWaitMs ?? 0;
      if (manualLoginWaitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, manualLoginWaitMs));
      }
      return;
    }

    const clicked = await this.clickFirst([...SELECTORS.loginButton]);
    if (clicked) {
      return;
    }

    throw new Error('minne ログインリンク送信ボタンまたはログインボタンを検出できませんでした');
  }

  private async openOrder(orderId: OrderId): Promise<void> {
    await this.page.goto(MINNE_ACCOUNT_URL);

    const clicked = await this.clickFirst([...SELECTORS.ordersNav]);
    if (!clicked) {
      throw new Error('minne 売れたもの導線を検出できませんでした');
    }

    // 「売れたもの」画面へ遷移後に対象注文を絞り込むため、注文一覧URLへ移動する。
    await this.page.goto(MINNE_ORDERS_URL);
    // 注文カードは invoice リンク href の注文IDで特定する。
    await this.optionalText(this.orderScopedSelectors(orderId, '.p-orders-item-buyer__invoice'));
  }

  private scrapeShippingAddressBlock(value: string): {
    buyerName: string;
    buyerPostalCode: string;
    buyerPrefecture: string;
    buyerCity: string;
    buyerAddress1: string;
    buyerAddress2?: string;
  } {
    const lines = value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length < 2) {
      throw new Error(`minne 配送先住所ブロックの形式が不正です: ${value}`);
    }

    const postalRaw = lines[0] ?? '';
    const postalCode = postalRaw.replace(/[^\d]/g, '');
    if (postalCode.length !== 7) {
      throw new Error(`minne 郵便番号を抽出できませんでした: ${postalRaw}`);
    }

    const buyerName = lines[lines.length - 1] ?? '';
    if (!buyerName) {
      throw new Error(`minne 購入者名を抽出できませんでした: ${value}`);
    }

    const addressLine = lines.slice(1, -1).join(' ').trim();
    if (!addressLine) {
      throw new Error(`minne 住所を抽出できませんでした: ${value}`);
    }

    const prefMatch = addressLine.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)(.+)$/);
    if (!prefMatch) {
      throw new Error(`minne 都道府県を抽出できませんでした: ${addressLine}`);
    }

    const buyerPrefecture = prefMatch[1];
    const addressRest = prefMatch[2]?.trim() ?? '';
    const cityMatch = addressRest.match(/^(.+?[市区町村郡])(.*)$/);
    const buyerCity = cityMatch?.[1]?.trim() ?? addressRest;
    const buyerAddress1 = cityMatch?.[2]?.trim() ?? '';

    if (!buyerCity || !buyerAddress1) {
      throw new Error(`minne 市区町村または番地を抽出できませんでした: ${addressLine}`);
    }

    return {
      buyerName,
      buyerPostalCode: postalCode,
      buyerPrefecture,
      buyerCity,
      buyerAddress1,
      buyerAddress2: undefined,
    };
  }

  private orderScopedSelectors(orderId: OrderId, suffix: string): string[] {
    const id = encodeURIComponent(orderId.toString());
    return [
      `.p-orders-item:has(a[href*="/account/orders/${id}/invoice"]) ${suffix}`,
      `.p-orders-item__buyer:has(a[href*="/account/orders/${id}/invoice"]) ${suffix}`,
      `.p-orders-item:has(a.p-orders-item-buyer__invoice[href*="${id}"]) ${suffix}`,
    ];
  }

  private parseOrderedAt(value: string): Date {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }
    const normalized = value
      .replace(/[年月]/g, '/')
      .replace(/日/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return new Date(normalized);
  }

  private async scrapeOrder(orderId: OrderId): Promise<MinneScrapedOrderData> {
    const shippingAddress = await this.requiredText(
      this.orderScopedSelectors(orderId, '.p-orders__shipping-address'),
      '配送先住所',
    );
    const parsed = this.scrapeShippingAddressBlock(shippingAddress);

    const buyerName =
      parsed.buyerName ||
      (await this.requiredText([...SELECTORS.buyerName], '購入者名').catch(() => ''));
    const buyerPhone =
      (await this.optionalText(this.orderScopedSelectors(orderId, '.p-orders-item__buyer-tel'))) ??
      (await this.optionalText([...SELECTORS.phone]));
    const productName = await this.requiredText(
      [
        ...this.orderScopedSelectors(orderId, '.p-orders-item__title'),
        ...this.orderScopedSelectors(orderId, '.p-orders-item__item-name'),
        ...SELECTORS.productName,
      ],
      '商品名',
    );
    const orderedAtText = await this.requiredText(
      [
        ...this.orderScopedSelectors(orderId, '.p-orders-item__date'),
        ...this.orderScopedSelectors(orderId, 'time'),
        ...SELECTORS.orderedAt,
      ],
      '注文日時',
    );
    const orderedAt = this.parseOrderedAt(orderedAtText);
    if (Number.isNaN(orderedAt.getTime())) {
      throw new Error(`注文日時の形式が不正です: ${orderedAtText}`);
    }

    return {
      buyerName,
      buyerPostalCode: parsed.buyerPostalCode,
      buyerPrefecture: parsed.buyerPrefecture,
      buyerCity: parsed.buyerCity,
      buyerAddress1: parsed.buyerAddress1,
      buyerAddress2: parsed.buyerAddress2,
      buyerPhone: buyerPhone?.replace(/[^\d]/g, '') || undefined,
      productName,
      orderedAt,
    };
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

  private async requiredText(selectors: string[], fieldLabel: string): Promise<string> {
    const value = await this.optionalText(selectors);
    if (!value) {
      throw new Error(`minne 注文詳細の${fieldLabel}を取得できませんでした`);
    }
    return value;
  }

  private async optionalText(selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const text = await this.page.textContent(selector);
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
}

import { OrderId } from '@/domain/valueObjects/OrderId';

const MINNE_LOGIN_URL = 'https://minne.com/signin';
const MINNE_ORDER_DETAIL_URL = 'https://minne.com/orders';

const SELECTORS = {
  email: ['#email', 'input[name="email"]', 'input[type="email"]'] as const,
  password: ['#password', 'input[name="password"]', 'input[type="password"]'] as const,
  loginButton: ['button[type="submit"]', 'input[type="submit"]', 'text=ログイン'] as const,
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
  readonly password: string;
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
    return this.scrapeOrder();
  }

  private async login(credentials: MinneCredentials): Promise<void> {
    await this.page.goto(MINNE_LOGIN_URL);

    const emailFilled = await this.fillFirst([...SELECTORS.email], credentials.email);
    if (!emailFilled) {
      throw new Error('minne ログインメール入力欄を検出できませんでした');
    }

    const passwordFilled = await this.fillFirst([...SELECTORS.password], credentials.password);
    if (!passwordFilled) {
      throw new Error('minne ログインパスワード入力欄を検出できませんでした');
    }

    const clicked = await this.clickFirst([...SELECTORS.loginButton]);
    if (!clicked) {
      throw new Error('minne ログインボタンを検出できませんでした');
    }
  }

  private async openOrder(orderId: OrderId): Promise<void> {
    await this.page.goto(`${MINNE_ORDER_DETAIL_URL}/${encodeURIComponent(orderId.toString())}`);
  }

  private async scrapeOrder(): Promise<MinneScrapedOrderData> {
    const buyerName = await this.requiredText([...SELECTORS.buyerName], '購入者名');
    const buyerPostalCode = await this.requiredText([...SELECTORS.postalCode], '郵便番号');
    const buyerPrefecture = await this.requiredText([...SELECTORS.prefecture], '都道府県');
    const buyerCity = await this.requiredText([...SELECTORS.city], '市区町村');
    const buyerAddress1 = await this.requiredText([...SELECTORS.address1], '番地');
    const buyerAddress2 = await this.optionalText([...SELECTORS.address2]);
    const buyerPhone = await this.optionalText([...SELECTORS.phone]);
    const productName = await this.requiredText([...SELECTORS.productName], '商品名');
    const orderedAtText = await this.requiredText([...SELECTORS.orderedAt], '注文日時');
    const orderedAt = new Date(orderedAtText);
    if (Number.isNaN(orderedAt.getTime())) {
      throw new Error(`注文日時の形式が不正です: ${orderedAtText}`);
    }

    return {
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

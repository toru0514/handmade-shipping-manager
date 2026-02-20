import { Order } from '@/domain/entities/Order';

const YAMATO_AUTH_LOGIN_URL = 'https://auth.kms.kuronekoyamato.co.jp/auth/login';
const YAMATO_SHIP_BOOK_MENU_URL =
  'https://ship-book.kuronekoyamato.co.jp/ship_book/index.jsp?_A=OTODOKE&_R=menu_personal_portal&utm_source=NRCWBMM0120';
const SHORT_TIMEOUT_MS = 1_500;

const SELECTORS = {
  memberId: [
    '#login-form-id',
    '#member-id',
    '#loginId',
    'input[name="member_id"]',
    'input[name="memberId"]',
    'input[name="login_id"]',
    'input[name="loginId"]',
    'input[name="mailAddress"]',
    'input[type="email"]',
  ] as const,
  password: [
    '#login-form-password',
    '#password',
    'input[name="password"]',
    'input[name="passwd"]',
  ] as const,
  loginButton: [
    'text=ログイン',
    'button:has-text("ログイン")',
    'input[type="submit"][value*="ログイン"]',
  ] as const,
  issueMenu: ['text=送り状を発行する', 'text=送り状を発行'] as const,
  compactType: ['text=宅急便コンパクト'] as const,
  pudoType: ['text=PUDO', 'text=宅配便ロッカー'] as const,
  postalCode: ['#postal-code', 'input[name="postal_code"]', 'input[name="zip"]'] as const,
  fullAddress: ['#address', 'textarea[name="address"]', 'input[name="address"]'] as const,
  prefecture: ['select[name="prefecture"]', 'input[name="prefecture"]'] as const,
  city: ['input[name="city"]', 'input[name="address1"]'] as const,
  street: ['input[name="street"]', 'input[name="address2"]'] as const,
  building: ['input[name="building"]', 'input[name="address3"]'] as const,
  name: ['#name', 'input[name="name"]', 'input[name="consignee_name"]'] as const,
  phone: ['#phone', 'input[name="phone"]', 'input[name="tel"]'] as const,
  productName: ['#product-name', 'input[name="item_name"]', 'textarea[name="item_name"]'] as const,
  issueButton: ['text=送り状を発行', 'text=発行する', 'button:has-text("送り状")'] as const,
  qrText: ['#qr-code-data', '[data-testid="qr-code"]', '.qr-code'] as const,
  qrImageSrc: ['img[alt*="QR"]', 'img[src^="data:image"]', 'canvas + img'] as const,
  qrInputValue: ['input[name="qrCode"]', 'input[name="qr_code"]'] as const,
  waybill: ['#waybill-number', '[data-testid="waybill-number"]', '.waybill-number'] as const,
  error: [
    '[role="alert"]',
    '.error',
    '.error-message',
    'text=エラー',
    'text=ログインに失敗',
  ] as const,
} as const;

export interface YamatoCredentials {
  readonly memberId: string;
  readonly password: string;
}

export interface YamatoPlaywrightPageLike {
  // TODO: アダプタが増えたら Playwright の共通ページ型（BasePlaywrightPageLike）へ統合する
  goto(url: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  textContent(selector: string): Promise<string | null>;
  waitForSelector?(
    selector: string,
    options?: { timeout?: number; state?: 'attached' | 'visible' },
  ): Promise<unknown>;
  waitForLoadState?(state?: 'domcontentloaded' | 'load' | 'networkidle'): Promise<void>;
  getAttribute?(selector: string, name: string): Promise<string | null>;
  inputValue?(selector: string): Promise<string>;
}

export interface YamatoIssueResult {
  readonly qrCode: string;
  readonly waybillNumber: string;
}

export class YamatoPudoPage {
  constructor(private readonly page: YamatoPlaywrightPageLike) {}

  async issueLabel(order: Order, credentials: YamatoCredentials): Promise<YamatoIssueResult> {
    await this.page.goto(YAMATO_AUTH_LOGIN_URL);
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.login(credentials);
    await this.page.goto(YAMATO_SHIP_BOOK_MENU_URL);
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.openIssueForm();
    await this.fillOrder(order);
    await this.clickFirst(SELECTORS.issueButton, '送り状発行ボタン');
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.throwIfErrorDisplayed();

    const qrCode = await this.resolveQrCode();
    if (!qrCode) {
      throw new Error('QRコードを取得できませんでした');
    }

    const waybillNumber = await this.textFromFirst(SELECTORS.waybill);
    if (!waybillNumber) {
      throw new Error('送り状番号を取得できませんでした');
    }

    return {
      qrCode,
      waybillNumber,
    };
  }

  private async login(credentials: YamatoCredentials): Promise<void> {
    await this.fillFirst(SELECTORS.memberId, credentials.memberId, '会員ID');
    await this.fillFirst(SELECTORS.password, credentials.password, 'パスワード');
    await this.clickFirst(SELECTORS.loginButton, 'ログインボタン');
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.throwIfErrorDisplayed();
  }

  private async openIssueForm(): Promise<void> {
    await this.clickFirst(SELECTORS.issueMenu, '送り状発行メニュー');
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.clickFirst(SELECTORS.compactType, '宅急便コンパクト');
    await this.clickFirst(SELECTORS.pudoType, 'PUDO');
    await this.page.waitForLoadState?.('domcontentloaded');
  }

  private async fillOrder(order: Order): Promise<void> {
    await this.fillFirst(
      SELECTORS.postalCode,
      order.buyer.address.postalCode.toString(),
      '郵便番号',
    );

    const fullAddress = this.buildAddress(order);
    const hasFullAddressInput = await this.fillFirstOptional(SELECTORS.fullAddress, fullAddress);
    if (!hasFullAddressInput) {
      const address = order.buyer.address;
      await this.fillFirstOptional(SELECTORS.prefecture, address.prefecture.toString());
      await this.fillFirstOptional(SELECTORS.city, address.city);
      await this.fillFirstOptional(SELECTORS.street, address.street);
      await this.fillFirstOptional(SELECTORS.building, address.building ?? '');
    }

    await this.fillFirst(SELECTORS.name, order.buyer.name.toString(), '氏名');
    await this.fillFirstOptional(SELECTORS.phone, order.buyer.phoneNumber?.toString() ?? '');
    await this.fillFirst(SELECTORS.productName, order.product.name, '品名');
  }

  private async resolveQrCode(): Promise<string | null> {
    const textQr = await this.textFromFirst(SELECTORS.qrText);
    if (textQr) {
      return textQr;
    }

    const srcQr = await this.attributeFromFirst(SELECTORS.qrImageSrc, 'src');
    if (srcQr) {
      return srcQr.trim();
    }

    const valueQr = await this.inputValueFromFirst(SELECTORS.qrInputValue);
    if (valueQr) {
      return valueQr;
    }

    return null;
  }

  private buildAddress(order: Order): string {
    const address = order.buyer.address;
    return [address.prefecture.toString(), address.city, address.street, address.building ?? '']
      .join('')
      .trim();
  }

  private async throwIfErrorDisplayed(): Promise<void> {
    const message = await this.textFromFirst(SELECTORS.error);
    if (message) {
      throw new Error(`ヤマトPUDO画面でエラーを検出しました: ${message}`);
    }
  }

  private async fillFirstOptional(selectors: readonly string[], value: string): Promise<boolean> {
    const selector = await this.firstExistingSelector(selectors);
    if (!selector) {
      return false;
    }
    await this.page.fill(selector, value);
    return true;
  }

  private async fillFirst(
    selectors: readonly string[],
    value: string,
    fieldLabel: string,
  ): Promise<void> {
    const filled = await this.fillFirstOptional(selectors, value);
    if (!filled) {
      throw new Error(`${fieldLabel} の入力欄が見つかりませんでした`);
    }
  }

  private async clickFirst(selectors: readonly string[], actionLabel: string): Promise<void> {
    const selector = await this.firstExistingSelector(selectors);
    if (!selector) {
      throw new Error(`${actionLabel} の要素が見つかりませんでした`);
    }
    await this.page.click(selector);
  }

  private async textFromFirst(selectors: readonly string[]): Promise<string | null> {
    for (const selector of selectors) {
      if (!(await this.selectorExists(selector))) {
        continue;
      }
      const value = (await this.page.textContent(selector))?.trim();
      if (value) {
        return value;
      }
    }
    return null;
  }

  private async attributeFromFirst(
    selectors: readonly string[],
    name: string,
  ): Promise<string | null> {
    if (!this.page.getAttribute) {
      return null;
    }
    for (const selector of selectors) {
      if (!(await this.selectorExists(selector))) {
        continue;
      }
      const value = await this.page.getAttribute(selector, name);
      if (value?.trim()) {
        return value;
      }
    }
    return null;
  }

  private async inputValueFromFirst(selectors: readonly string[]): Promise<string | null> {
    if (!this.page.inputValue) {
      return null;
    }
    for (const selector of selectors) {
      if (!(await this.selectorExists(selector))) {
        continue;
      }
      const value = (await this.page.inputValue(selector)).trim();
      if (value) {
        return value;
      }
    }
    return null;
  }

  private async firstExistingSelector(selectors: readonly string[]): Promise<string | null> {
    for (const selector of selectors) {
      if (await this.selectorExists(selector)) {
        return selector;
      }
    }
    return null;
  }

  private async selectorExists(selector: string): Promise<boolean> {
    if (!this.page.waitForSelector) {
      return true;
    }

    try {
      await this.page.waitForSelector(selector, {
        timeout: SHORT_TIMEOUT_MS,
        state: 'visible',
      });
      return true;
    } catch {
      return false;
    }
  }
}

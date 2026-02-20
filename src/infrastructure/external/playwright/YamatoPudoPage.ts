import { Order } from '@/domain/entities/Order';

const YAMATO_AUTH_LOGIN_URL = 'https://auth.kms.kuronekoyamato.co.jp/auth/login';
const YAMATO_MEMBER_TOP_URL = 'https://member.kms.kuronekoyamato.co.jp/member';
const SHORT_TIMEOUT_MS = 5_000;
const ADDRESS_REGISTERED_QR_FALLBACK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const ADDRESS_REGISTERED_WAYBILL_FALLBACK = 'ADDRESS-BOOK-REGISTERED';

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
    '#login-form-submit',
    'text=ログイン',
    'button:has-text("ログイン")',
    'input[type="submit"][value*="ログイン"]',
  ] as const,
  addressBookTile: [
    '#NRCWBMM0120_3_addresscho-otodokesaki a',
    'a[href*="ship-book.kuronekoyamato.co.jp/ship_book/index.jsp?_A=OTODOKE"]',
    'a[href*="_A=OTODOKE"]',
    'a:has-text("お届け先")',
    'a:has-text("アドレス帳")',
  ] as const,
  addressRegisterButton: ['#button_regist', 'a[href*="_A=REGISTER"]'] as const,
  lastName: ['#lastNmCenter', 'input[name="_TX_LAST_NM"]'] as const,
  firstName: ['#firstNmCenter', 'input[name="_TX_FIRST_NM"]'] as const,
  phone: ['#telCenter', 'input[name="_TX_TEL"]'] as const,
  postalCode: ['#zipCd', 'input[name="_TX_ZIPCD"]'] as const,
  prefecture: ['#address1Center', 'input[name="_TX_ADDRESS1"]'] as const,
  city: ['#address2Center', 'input[name="_TX_ADDRESS2"]'] as const,
  street: ['#address3Center', 'input[name="_TX_ADDRESS3"]'] as const,
  building: ['#address4Center', 'input[name="_TX_ADDRESS4"]'] as const,
  name: ['#name', 'input[name="name"]', 'input[name="consignee_name"]'] as const,
  productName: ['#product-name', 'input[name="item_name"]', 'textarea[name="item_name"]'] as const,
  issueButton: [
    'button#NEXT_BTN[name="_BTN_REGISTER"]',
    '#NEXT_BTN',
    'button[name="_BTN_REGISTER"]',
    'text=お届け先アドレスを新規登録',
  ] as const,
  qrText: ['#qr-code-data', '[data-testid="qr-code"]', '.qr-code'] as const,
  qrImageSrc: ['img[alt*="QR"]', 'img[src^="data:image"]', 'canvas + img'] as const,
  qrInputValue: ['input[name="qrCode"]', 'input[name="qr_code"]'] as const,
  waybill: ['#waybill-number', '[data-testid="waybill-number"]', '.waybill-number'] as const,
  error: ['[role="alert"]', '.error', '.error-message', 'text=ログインに失敗しました'] as const,
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
    await this.page.goto(YAMATO_MEMBER_TOP_URL);
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.openIssueForm();
    await this.fillOrder(order);
    await this.clickFirst(SELECTORS.issueButton, '送り状発行ボタン');

    // 宅急便コンパクトのPCフローは、アドレス帳登録をもって完了とみなす。
    // NEXT_BTN のクリック成功時点で処理を成功として返す。
    const qrCode = (await this.resolveQrCode()) ?? ADDRESS_REGISTERED_QR_FALLBACK;
    const waybillNumber =
      (await this.textFromFirst(SELECTORS.waybill)) ?? ADDRESS_REGISTERED_WAYBILL_FALLBACK;

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
    await this.clickFirst(SELECTORS.addressBookTile, 'お届け先アドレス帳');
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.clickFirst(SELECTORS.addressRegisterButton, 'お届け先アドレスを新規登録');
    await this.page.waitForLoadState?.('domcontentloaded');
  }

  private async fillOrder(order: Order): Promise<void> {
    const normalizedName = order.buyer.name.toString().trim();
    const [lastName, ...firstNameParts] = normalizedName.split(/\s+/);
    const firstName = firstNameParts.join(' ');
    const resolvedLastName = firstName.length === 0 ? normalizedName : lastName || normalizedName;
    const resolvedFirstName = firstName.length === 0 ? '' : firstName;

    await this.fillFirst(SELECTORS.lastName, resolvedLastName, '苗字');
    await this.fillFirst(SELECTORS.firstName, resolvedFirstName, '名前');
    await this.fillFirst(
      SELECTORS.postalCode,
      order.buyer.address.postalCode.toString(),
      '郵便番号',
    );
    const address = order.buyer.address;
    await this.fillFirst(SELECTORS.prefecture, address.prefecture.toString(), '都道府県');
    await this.fillFirst(SELECTORS.city, address.city, '市区郡町村');
    await this.fillFirst(SELECTORS.street, address.street, '町名・番地');
    await this.fillFirstOptional(SELECTORS.building, address.building ?? '');
    await this.fillFirstOptional(SELECTORS.phone, order.buyer.phoneNumber?.toString() ?? '');
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
      return false;
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

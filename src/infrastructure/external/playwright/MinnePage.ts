// minne 注文詳細ページから購入者情報を取得する Playwright ラッパー
//
// ログイン方式: マジックリンク認証（パスワードなし）
//   ① sendLoginLink(email)    … メアドを入力して「ログインリンクを送信」ボタンをクリック
//   ② openLoginLink(url)      … メールから取得したURLをブラウザで開いてセッション確立
//   ③ fetchOrderData(orderId) … 注文詳細ページに移動して購入者情報を抽出
//
// 注文詳細 URL: https://minne.com/account/orders/{orderId}
//
// 配送先情報ブロックの HTML 構造:
//   <h3 class="p-content-section__heading">配送先情報</h3>
//   <div class="p-content-section__body">
//     <div>
//       〒220-0073<br>
//       神奈川県横浜市西区岡野 1-1-17 ベイシス横濱岡野1階<br>
//       篠原 有里<br>
//       TEL：0468617084
//     </div>
//   </div>
// → innerText で取得し、行単位でパースする

const MINNE_LOGIN_URL = 'https://minne.com/users/sign_in';
const MINNE_ORDER_BASE_URL = 'https://minne.com/account/orders';
const SHORT_TIMEOUT_MS = 3_000;

const SELECTORS = {
  // メールアドレス入力欄
  email: ['input[type="email"]', '#user_email', 'input[name="user[email]"]'] as const,
  // 「ログインリンクを送信」ボタン
  sendLoginLinkButton: [
    'button:has-text("ログインリンクを送信")',
    'button[type="submit"]:has-text("ログイン")',
    'button[type="submit"]',
    'input[type="submit"]',
  ] as const,
  // 配送先情報ブロック全体（郵便番号・住所・氏名・電話番号をまとめて取得）
  deliveryBlock: [
    'h3:has-text("配送先情報") + .p-content-section__body > div',
    'h3:has-text("配送先情報") ~ .p-content-section__body > div',
    '.p-content-section__body > div:first-child',
  ] as const,
  // 商品名（確認済み: .p-order-product__name a）
  productName: [
    '.p-order-product__name a',
    '.p-order-product__name',
    '.item-name a',
    '.item-name',
    'dt:has-text("商品名") + dd',
    'th:has-text("商品名") ~ td',
    '[data-testid="product-name"]',
  ] as const,
  // オプション明細（確認済み: .p-order-product__custom-detail）
  // 例: "イヤーカフサイズ(金/銀箔)：三角M(金箔) (0円)"
  productOption: ['.p-order-product__custom-detail'] as const,
  // 商品金額
  price: [
    'dt:has-text("商品金額") + dd',
    'dt:has-text("合計金額") + dd',
    'dt:has-text("金額") + dd',
    'th:has-text("金額") ~ td',
    '.order-total',
    '.price',
    '[data-testid="price"]',
  ] as const,
  // 注文日
  orderedAt: [
    'dt:has-text("注文日") + dd',
    'dt:has-text("購入日") + dd',
    'th:has-text("注文日") ~ td',
    '.order-date',
    '.ordered-at',
    '[data-testid="ordered-at"]',
    'time',
  ] as const,
  // エラーメッセージ
  error: [
    '.flash--error',
    '.flash-message--error',
    '.alert-danger',
    '[role="alert"]',
    '.error-message',
  ] as const,
} as const;

export interface MinnePlaywrightPageLike {
  goto(url: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  textContent(selector: string): Promise<string | null>;
  // innerText は <br> を \n に変換して返すため配送先ブロックのパースに使用
  innerText?(selector: string): Promise<string>;
  waitForSelector?(
    selector: string,
    options?: { timeout?: number; state?: 'attached' | 'visible' | 'detached' | 'hidden' },
  ): Promise<unknown>;
  waitForLoadState?(state?: 'domcontentloaded' | 'load' | 'networkidle'): Promise<void>;
  // ページ内 JS 評価（注文一覧から href を一括取得するために使用）
  evaluate?<T = unknown>(fn: () => T): Promise<T>;
}

export interface MinneFetchResult {
  readonly orderId: string;
  readonly buyerName: string;
  readonly buyerPostalCode: string;
  readonly buyerPrefecture: string;
  readonly buyerCity: string;
  readonly buyerAddress1: string;
  readonly buyerAddress2?: string;
  readonly buyerPhone?: string;
  readonly productName: string;
  readonly price?: number;
  readonly orderedAt: Date;
}

export class MinnePage {
  constructor(private readonly page: MinnePlaywrightPageLike) {}

  /**
   * ① ログインページでメールアドレスを入力し「ログインリンクを送信」ボタンをクリックする。
   */
  async sendLoginLink(email: string): Promise<void> {
    await this.page.goto(MINNE_LOGIN_URL);
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.fillFirst(SELECTORS.email, email, 'メールアドレス');
    await this.clickFirst(SELECTORS.sendLoginLinkButton, 'ログインリンク送信ボタン');
    await this.page.waitForLoadState?.('domcontentloaded');
    await this.throwIfErrorDisplayed();
  }

  /**
   * ② メールから取得したログインリンク URL をブラウザで開き、セッションを確立する。
   */
  async openLoginLink(loginUrl: string): Promise<void> {
    await this.page.goto(loginUrl);
    await this.page.waitForLoadState?.('networkidle');
    await this.throwIfErrorDisplayed();
  }

  /**
   * ③ 注文一覧ページに移動して全注文IDを返す。
   *    スプシに未登録の注文だけを後続処理で取得するために使用する。
   */
  async fetchAllOrderIds(): Promise<string[]> {
    await this.page.goto(`${MINNE_ORDER_BASE_URL}`);
    await this.page.waitForLoadState?.('networkidle');

    if (!this.page.evaluate) {
      throw new Error('fetchAllOrderIds: evaluate が未実装のページオブジェクトです');
    }

    // ページ内の全注文リンクの href を取得
    const hrefs = await this.page.evaluate(() => {
      const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/account/orders/"]');
      return Array.from(links).map((a) => a.href);
    });

    // /account/orders/{数字} の形式から ID を抽出（宛名印刷・らくらく等のサブパスは除外）
    const seen = new Set<string>();
    for (const href of hrefs) {
      const match = href.match(/\/account\/orders\/(\d+)(?:\/|$)/);
      if (match?.[1]) {
        seen.add(match[1]);
      }
    }

    return [...seen];
  }

  /**
   * ④ セッション確立後、注文詳細ページに移動して購入者情報を取得する。
   */
  async fetchOrderData(orderId: string): Promise<MinneFetchResult> {
    await this.page.goto(`${MINNE_ORDER_BASE_URL}/${orderId}`);
    await this.page.waitForLoadState?.('networkidle');
    await this.throwIfErrorDisplayed();
    return this.extractOrderData(orderId);
  }

  private async extractOrderData(orderId: string): Promise<MinneFetchResult> {
    // 配送先情報ブロックを innerText で取得（<br> → \n 変換）
    const deliveryText = await this.innerTextFromFirst(SELECTORS.deliveryBlock);
    if (!deliveryText) {
      throw new Error(`配送先情報ブロックを取得できませんでした (注文ID: ${orderId})`);
    }

    const delivery = this.parseDeliveryBlock(deliveryText);
    const parsedAddress = this.parseAddress(delivery.address);

    const productNameRaw = await this.textFromFirst(SELECTORS.productName);
    const productOptionRaw = await this.textFromFirst(SELECTORS.productOption);
    const priceRaw = await this.textFromFirst(SELECTORS.price);
    const orderedAtRaw = await this.textFromFirst(SELECTORS.orderedAt);

    const productName = this.buildProductName(
      productNameRaw?.trim() ?? '',
      productOptionRaw ?? null,
    );

    return {
      orderId,
      buyerName: delivery.name,
      buyerPostalCode: delivery.postalCode,
      buyerPrefecture: parsedAddress.prefecture,
      buyerCity: parsedAddress.city,
      buyerAddress1: parsedAddress.street,
      buyerAddress2: parsedAddress.building,
      buyerPhone: delivery.phone,
      productName,
      price: this.parsePrice(priceRaw),
      orderedAt: this.parseDate(orderedAtRaw),
    };
  }

  /**
   * 商品名とオプション値を結合して「商品名(オプション値)」形式を返す。
   *
   * オプションテキスト例:
   *   "イヤーカフサイズ(金/銀箔)：三角M(金箔) (0円)"
   *   → オプション値: "三角M(金箔)"
   *   → 結果: "商品名(三角M(金箔))"
   *
   * オプションが複数ある場合（複数 `.p-order-product__custom-detail`）は
   * 現状 textFromFirst で最初の1件のみ取得する。
   * 複数オプションが必要になったら evaluate で全件取得する方式に拡張すること。
   */
  private buildProductName(name: string, optionDetailText: string | null): string {
    if (!optionDetailText) return name;

    const optionValue = this.parseOptionValue(optionDetailText);
    if (!optionValue) return name;

    return `${name}(${optionValue})`;
  }

  /**
   * オプション明細テキストから値部分のみを抽出する。
   *
   * 形式: "{オプション名}：{オプション値} ({価格}円)"
   * → "{オプション値}" を返す
   */
  private parseOptionValue(detailText: string): string | undefined {
    // 全角コロン「：」で分割（ASCII「:」も念のため対応）
    const colonIdx = detailText.search(/[：:]/);
    if (colonIdx === -1) return undefined;

    const afterColon = detailText.substring(colonIdx + 1);
    // 末尾の " (0円)" / " (3500円)" を除去
    return afterColon.replace(/\s*\(\d+円\)\s*$/, '').trim() || undefined;
  }

  /**
   * 配送先ブロックのテキストを行単位でパースする。
   *
   * 想定フォーマット（行順）:
   *   〒220-0073
   *   神奈川県横浜市西区岡野 1-1-17 ベイシス横濱岡野1階
   *   篠原 有里
   *   TEL：0468617084
   */
  private parseDeliveryBlock(rawText: string): {
    postalCode: string;
    address: string;
    name: string;
    phone?: string;
  } {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // TEL 行を起点に逆算（行順が変わっても対応できるように）
    const telIdx = lines.findIndex((l) => /^TEL[：:]/i.test(l));

    let phone: string | undefined;
    let name: string;
    let address: string;
    let postalCode: string;

    if (telIdx >= 0) {
      phone = lines[telIdx].replace(/^TEL[：:]\s*/i, '').trim();
      name = lines[telIdx - 1] ?? '';
      address = lines[telIdx - 2] ?? '';
      postalCode = lines[telIdx - 3] ?? '';
    } else {
      // TEL 行がない場合: 末尾から逆算
      name = lines[lines.length - 1] ?? '';
      address = lines[lines.length - 2] ?? '';
      postalCode = lines[lines.length - 3] ?? '';
    }

    return {
      postalCode: postalCode.replace(/[〒\s\-ー－]/g, ''),
      address: address.trim(),
      name: name.trim(),
      phone: phone?.replace(/\s+/g, '') || undefined,
    };
  }

  // 住所文字列を都道府県 / 市区郡町村 / 番地 / 建物名に分割
  private parseAddress(raw: string): {
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

    // スペースで番地と建物名を分割（例: "岡野 1-1-17 ベイシス横濱岡野1階"）
    const spaceIdx = afterCity.search(/\s+/);
    if (spaceIdx === -1) {
      return { prefecture, city, street: afterCity };
    }
    const street = afterCity.substring(0, spaceIdx).trim();
    const building = afterCity.substring(spaceIdx).trim() || undefined;

    return { prefecture, city, street, building };
  }

  private parsePrice(raw: string | null): number | undefined {
    if (!raw) return undefined;
    const digits = raw.replace(/[^\d]/g, '');
    const num = parseInt(digits, 10);
    return isNaN(num) ? undefined : num;
  }

  private parseDate(raw: string | null): Date {
    if (!raw) return new Date();
    const patterns = [
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
      /(\d{4})年(\d{1,2})月(\d{1,2})日/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
    ];
    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
    }
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private async throwIfErrorDisplayed(): Promise<void> {
    const message = await this.textFromFirst(SELECTORS.error);
    if (message) {
      throw new Error(`minne画面でエラーを検出しました: ${message}`);
    }
  }

  // innerText で取得（<br> → \n）。未対応の場合は textContent にフォールバック
  private async innerTextFromFirst(selectors: readonly string[]): Promise<string | null> {
    for (const selector of selectors) {
      if (!(await this.selectorExists(selector))) continue;
      if (this.page.innerText) {
        const text = (await this.page.innerText(selector)).trim();
        if (text) return text;
      } else {
        const text = (await this.page.textContent(selector))?.trim();
        if (text) return text;
      }
    }
    return null;
  }

  private async fillFirst(
    selectors: readonly string[],
    value: string,
    fieldLabel: string,
  ): Promise<void> {
    const selector = await this.firstExistingSelector(selectors);
    if (!selector) {
      throw new Error(`${fieldLabel} の入力欄が見つかりませんでした`);
    }
    await this.page.fill(selector, value);
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
      if (!(await this.selectorExists(selector))) continue;
      const value = (await this.page.textContent(selector))?.trim();
      if (value) return value;
    }
    return null;
  }

  private async firstExistingSelector(selectors: readonly string[]): Promise<string | null> {
    for (const selector of selectors) {
      if (await this.selectorExists(selector)) return selector;
    }
    return null;
  }

  private async selectorExists(selector: string): Promise<boolean> {
    if (!this.page.waitForSelector) return false;
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

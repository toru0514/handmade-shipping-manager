import { Order } from '@/domain/entities/Order';

const CLICK_POST_URL = 'https://clickpost.jp/';
const CONFIRMATION_PAGE_TIMEOUT_MS = 30_000;
const APPLY_FORM_TRANSITION_TIMEOUT_MS = 30_000;
const MANUAL_LOGIN_TIMEOUT_MS = 300_000;
const CLICK_TIMEOUT_DEFAULT_MS = 2_000;
const CLICK_TIMEOUT_CONSENT_MS = 500;
const CLICK_TIMEOUT_PAYMENT_MS = 5_000;
const WAIT_FOR_SELECTOR_SHORT_MS = 500;
const WAIT_FOR_SELECTOR_MEDIUM_MS = 1_000;
const WAIT_FOR_SELECTOR_LONG_MS = 5_000;
const WAIT_FOR_SELECTOR_XLONG_MS = 10_000;
const WAIT_FOR_SELECTOR_XXLONG_MS = 15_000;
const PAGE_GOTO_TIMEOUT_MS = 60_000;
const POLLING_INTERVAL_MS = 1_000;
const POLLING_INTERVAL_FAST_MS = 500;
const ADDRESS_LINE_MAX_LENGTH = 20;
const AMAZON_LOGIN_SELECTORS = [
  'a:has(img[src*="btn-login-amazon"])',
  'button:has(img[src*="btn-login-amazon"])',
  'img[src*="btn-login-amazon"]',
  'a:has(img[alt="ログイン"][src*="amazon"])',
  'button:has(img[alt="ログイン"][src*="amazon"])',
] as const;

export interface ClickPostCredentials {
  readonly email: string;
  readonly password: string;
}

export interface PlaywrightDownloadLike {
  createReadStream(): Promise<NodeJS.ReadableStream | null>;
}

export interface PlaywrightPageLike {
  goto(url: string, options?: { timeout?: number }): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string, options?: { timeout?: number }): Promise<void>;
  waitForEvent(event: 'download'): Promise<PlaywrightDownloadLike>;
  textContent(selector: string): Promise<string | null>;
  url?(): string;
  evaluate?<TResult = unknown, TArg = unknown>(
    pageFunction: (arg: TArg) => TResult,
    arg: TArg,
  ): Promise<TResult>;
  waitForLoadState?(state?: 'domcontentloaded' | 'load' | 'networkidle'): Promise<void>;
  waitForSelector?(
    selector: string,
    options?: { timeout?: number; state?: 'attached' | 'visible' },
  ): Promise<unknown>;
}

export interface ClickPostIssueResult {
  readonly pdfData: string;
  readonly trackingNumber: string;
}

/** ドライランモードで確認画面まで到達したことを示すエラー */
export class ClickPostDryRunCompletedError extends Error {
  constructor() {
    super('ドライラン完了: 確認画面まで到達しました。支払いは手動で行ってください。');
    this.name = 'ClickPostDryRunCompletedError';
  }
}

interface ClickPostPageOptions {
  readonly manualLogin?: boolean;
  readonly manualLoginTimeoutMs?: number;
  /** true の場合、確認画面まで進んで停止（支払いボタンはクリックしない） */
  readonly dryRun?: boolean;
}

export class ClickPostPage {
  constructor(
    private readonly page: PlaywrightPageLike,
    private readonly options: ClickPostPageOptions = {},
  ) {}

  async issueLabel(order: Order, credentials: ClickPostCredentials): Promise<ClickPostIssueResult> {
    await this.page.goto(CLICK_POST_URL, { timeout: PAGE_GOTO_TIMEOUT_MS });
    await this.login(credentials);
    await this.openSingleApplyForm();
    await this.fillOrder(order);

    // 確認画面への遷移を待機
    await this.waitForConfirmationPage();

    // ドライランモードの場合、ここで停止
    if (this.options.dryRun) {
      console.log(
        '[ClickPostPage] ドライランモード: 確認画面まで到達。支払いは手動で行ってください。',
      );
      throw new ClickPostDryRunCompletedError();
    }

    // 支払い手続きボタンをクリックしてPDFダウンロード
    const { pdfData, trackingNumber } = await this.submitPaymentAndDownload();

    return {
      pdfData,
      trackingNumber,
    };
  }

  private async waitForConfirmationPage(): Promise<void> {
    const confirmationSelectors = [
      // Amazon Pay ボタン（実際の支払いボタン）
      '.amazonpay-button-view1',
      'div.amazonpay-button-view1-gold',
      '[class*="amazonpay-button"]',
      // 支払いボタン（テキストベース）
      'input[type="submit"][value="支払い手続きをする"]',
      'input[name="confirm"][value="支払い手続きをする"]',
      'button:has-text("支払い手続きをする")',
      // 確認画面の特徴的な要素
      '.confirm-content',
      '#confirm-form',
    ];

    const startAt = Date.now();

    while (Date.now() - startAt < CONFIRMATION_PAGE_TIMEOUT_MS) {
      const currentUrl = this.page.url?.() ?? '';
      console.log(`[ClickPostPage] 確認画面待機中 (currentUrl=${currentUrl})`);

      // ページ読み込み待機
      await this.page.waitForLoadState?.('domcontentloaded');

      // バリデーションエラーをチェック
      const bodyText = await this.page.textContent('body');
      if (bodyText?.includes('エラー') || bodyText?.includes('入力してください')) {
        console.log('[ClickPostPage] フォームにバリデーションエラーがある可能性');
        // エラーがあってもしばらく待つ（ユーザーが手動で修正するかもしれない）
      }

      // 確認画面の要素を探す
      if (this.page.waitForSelector) {
        for (const selector of confirmationSelectors) {
          try {
            await this.page.waitForSelector(selector, {
              timeout: CLICK_TIMEOUT_DEFAULT_MS,
              state: 'visible',
            });
            console.log(`[ClickPostPage] 確認画面検出 (selector=${selector})`);
            return;
          } catch {
            // 次のセレクタを試す
          }
        }
      }

      // テキストベースでの確認（Amazon Pay含む）
      if (
        bodyText?.includes('支払い手続きをする') ||
        bodyText?.includes('お届け先確認') ||
        bodyText?.includes('Amazon Pay') ||
        bodyText?.includes('内容を確認')
      ) {
        console.log('[ClickPostPage] 確認画面をテキストで検出');
        return;
      }

      // URL変化で確認（/packages/confirm など）
      if (currentUrl.includes('/confirm') || currentUrl.includes('/payment')) {
        console.log('[ClickPostPage] 確認画面URLを検出');
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
    }

    const currentUrl = this.page.url?.() ?? 'unknown';
    throw new Error(`確認画面への遷移がタイムアウトしました (currentUrl=${currentUrl})`);
  }

  private async submitPaymentAndDownload(): Promise<{ pdfData: string; trackingNumber: string }> {
    const amazonPaySelectors = [
      'div.amazonpay-button-view1-gold',
      'div.amazonpay-button-view1',
      '.amazonpay-button-view1',
      '[class*="amazonpay-button"]',
    ];

    const legacyButtonSelectors = [
      'input[type="submit"][value="支払い手続きをする"]',
      'input[name="confirm"][value="支払い手続きをする"]',
      'button:has-text("支払い手続きをする")',
      'text=支払い手続きをする',
    ];

    // Amazon Payボタンが完全に初期化されるまで待機
    console.log('[ClickPostPage] Amazon Payボタンの準備を待機中');
    if (this.page.waitForSelector) {
      for (const selector of amazonPaySelectors) {
        try {
          await this.page.waitForSelector(selector, {
            timeout: WAIT_FOR_SELECTOR_LONG_MS,
            state: 'visible',
          });
          console.log(`[ClickPostPage] Amazon Payボタン検出: ${selector}`);
          break;
        } catch {
          // 次のセレクタを試す
        }
      }
    }

    // ボタンが安定するまで少し待機（JavaScriptの初期化完了を待つ）
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));

    // ダウンロードイベントの待機を開始
    const downloadPromise = this.page.waitForEvent('download');

    console.log('[ClickPostPage] 支払いボタンをクリック');

    // Amazon Payボタンをクリック（長めのタイムアウト）
    // Amazon Pay は描画完了まで時間がかかるため、通常クリックより長いタイムアウトを使う。
    let clicked = await this.clickIfPresent(amazonPaySelectors, {
      timeout: CLICK_TIMEOUT_PAYMENT_MS,
    });

    // Playwrightのclickが失敗した場合、JavaScriptでクリックを試行
    if (!clicked) {
      console.log('[ClickPostPage] Playwrightクリック失敗、JavaScriptクリックを試行');
      for (const selector of amazonPaySelectors) {
        const jsClicked = await this.clickByScript(selector);
        if (jsClicked) {
          console.log(`[ClickPostPage] JavaScriptクリック成功: ${selector}`);
          clicked = true;
          break;
        }
      }
    }

    // Amazon Payボタンが失敗した場合、従来のボタンを試行
    if (!clicked) {
      console.log('[ClickPostPage] Amazon Payボタン失敗、従来のボタンを試行');
      clicked = await this.clickIfPresent(legacyButtonSelectors, {
        timeout: CLICK_TIMEOUT_DEFAULT_MS,
      });
    }

    if (!clicked) {
      const currentUrl = this.page.url?.() ?? 'unknown';
      throw new Error(`支払い手続きボタンを検出できませんでした (currentUrl=${currentUrl})`);
    }

    console.log('[ClickPostPage] Amazon Payボタンクリック完了、確認ボタンを待機');

    // Amazon Pay確認ボタンを待機してクリック
    await this.clickAmazonPayConfirmButton();

    console.log('[ClickPostPage] Amazon Pay確認ボタンクリック完了、最終確認ボタンを待機');

    // 最終確認ボタン（支払手続き確定）をクリック
    await this.clickFinalPaymentButton();

    console.log('[ClickPostPage] 最終確認ボタンクリック完了、印刷同意画面を待機');

    // 印刷同意チェックボックスをチェックして「印字する」をクリック
    await this.checkPrintAgreeAndPrint();

    console.log('[ClickPostPage] 印字ボタンクリック完了、ダウンロード待機中');

    // ダウンロード完了を待機
    const download = await downloadPromise;
    const pdfData = await this.readDownloadAsBase64(download);

    // 追跡番号を取得（複数のセレクタを試行）
    const trackingNumber = await this.extractTrackingNumber();

    return { pdfData, trackingNumber };
  }

  private async clickAmazonPayConfirmButton(): Promise<void> {
    const confirmButtonSelectors = [
      'input.a-button-input[type="submit"][aria-labelledby="continue-button-announce"]',
      'input.a-button-input[type="submit"]',
      '#continue-button input[type="submit"]',
      '.a-button-input[type="submit"]',
      'input[aria-labelledby="continue-button-announce"]',
    ];

    // 確認ボタンが表示されるまで待機
    if (this.page.waitForSelector) {
      for (const selector of confirmButtonSelectors) {
        try {
          await this.page.waitForSelector(selector, {
            timeout: WAIT_FOR_SELECTOR_XLONG_MS,
            state: 'visible',
          });
          console.log(`[ClickPostPage] Amazon Pay確認ボタン検出: ${selector}`);
          break;
        } catch {
          // 次のセレクタを試す
        }
      }
    }

    // 少し待機してボタンが安定するのを待つ
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_FAST_MS));

    // 確認ボタンをクリック
    let clicked = await this.clickIfPresent(confirmButtonSelectors, {
      timeout: CLICK_TIMEOUT_PAYMENT_MS,
    });

    // Playwrightのclickが失敗した場合、JavaScriptでクリックを試行
    if (!clicked) {
      console.log('[ClickPostPage] 確認ボタンPlaywrightクリック失敗、JavaScriptクリックを試行');
      for (const selector of confirmButtonSelectors) {
        const jsClicked = await this.clickByScript(selector);
        if (jsClicked) {
          console.log(`[ClickPostPage] 確認ボタンJavaScriptクリック成功: ${selector}`);
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      const currentUrl = this.page.url?.() ?? 'unknown';
      throw new Error(`Amazon Pay確認ボタンを検出できませんでした (currentUrl=${currentUrl})`);
    }
  }

  private async clickFinalPaymentButton(): Promise<void> {
    const finalButtonSelectors = [
      'input[type="submit"][name="continue"][value="支払手続き確定"]',
      'input[type="submit"][value="支払手続き確定"]',
      'input.payment_complete_button',
      'input.button_important[type="submit"]',
      'input[data-disable-with="支払手続き確定"]',
    ];

    // 最終確認ボタンが表示されるまで待機
    if (this.page.waitForSelector) {
      for (const selector of finalButtonSelectors) {
        try {
          await this.page.waitForSelector(selector, {
            timeout: WAIT_FOR_SELECTOR_XLONG_MS,
            state: 'visible',
          });
          console.log(`[ClickPostPage] 最終確認ボタン検出: ${selector}`);
          break;
        } catch {
          // 次のセレクタを試す
        }
      }
    }

    // 少し待機してボタンが安定するのを待つ
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_FAST_MS));

    // 最終確認ボタンをクリック
    let clicked = await this.clickIfPresent(finalButtonSelectors, {
      timeout: CLICK_TIMEOUT_PAYMENT_MS,
    });

    // Playwrightのclickが失敗した場合、JavaScriptでクリックを試行
    if (!clicked) {
      console.log('[ClickPostPage] 最終確認ボタンPlaywrightクリック失敗、JavaScriptクリックを試行');
      for (const selector of finalButtonSelectors) {
        const jsClicked = await this.clickByScript(selector);
        if (jsClicked) {
          console.log(`[ClickPostPage] 最終確認ボタンJavaScriptクリック成功: ${selector}`);
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      const currentUrl = this.page.url?.() ?? 'unknown';
      throw new Error(
        `最終確認ボタン（支払手続き確定）を検出できませんでした (currentUrl=${currentUrl})`,
      );
    }
  }

  private async checkPrintAgreeAndPrint(): Promise<void> {
    const checkboxSelectors = [
      '#print_agree',
      'input[name="agree"]#print_agree',
      'input[name="agree"][type="checkbox"]',
      'input#print_agree[type="checkbox"]',
    ];

    const printButtonSelectors = [
      'input[type="submit"][value="印字する"]',
      'button:has-text("印字する")',
      'text=印字する',
      'input[type="submit"]:has-text("印字")',
    ];

    // チェックボックスが表示されるまで待機
    if (this.page.waitForSelector) {
      for (const selector of checkboxSelectors) {
        try {
          await this.page.waitForSelector(selector, {
            timeout: WAIT_FOR_SELECTOR_XLONG_MS,
            state: 'visible',
          });
          console.log(`[ClickPostPage] 印刷同意チェックボックス検出: ${selector}`);
          break;
        } catch {
          // 次のセレクタを試す
        }
      }
    }

    // チェックボックスをチェック
    let checked = false;
    if (this.page.evaluate) {
      try {
        checked = await this.page.evaluate((selectors: string[]) => {
          for (const selector of selectors) {
            const checkbox = document.querySelector<HTMLInputElement>(selector);
            if (checkbox) {
              if (!checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
              }
              return true;
            }
          }
          return false;
        }, checkboxSelectors);
      } catch {
        // フォールバックでクリック
      }
    }

    if (!checked) {
      checked = await this.clickIfPresent(checkboxSelectors, { timeout: CLICK_TIMEOUT_DEFAULT_MS });
    }

    if (!checked) {
      const currentUrl = this.page.url?.() ?? 'unknown';
      throw new Error(`印刷同意チェックボックスを検出できませんでした (currentUrl=${currentUrl})`);
    }

    console.log('[ClickPostPage] 印刷同意チェック完了、印字ボタンを待機');

    // 少し待機してボタンが有効になるのを待つ
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_FAST_MS));

    // 印字ボタンが表示されるまで待機
    if (this.page.waitForSelector) {
      for (const selector of printButtonSelectors) {
        try {
          await this.page.waitForSelector(selector, {
            timeout: WAIT_FOR_SELECTOR_LONG_MS,
            state: 'visible',
          });
          console.log(`[ClickPostPage] 印字ボタン検出: ${selector}`);
          break;
        } catch {
          // 次のセレクタを試す
        }
      }
    }

    // 印字ボタンをクリック
    let clicked = await this.clickIfPresent(printButtonSelectors, {
      timeout: CLICK_TIMEOUT_PAYMENT_MS,
    });

    // Playwrightのclickが失敗した場合、JavaScriptでクリックを試行
    if (!clicked) {
      console.log('[ClickPostPage] 印字ボタンPlaywrightクリック失敗、JavaScriptクリックを試行');
      for (const selector of printButtonSelectors) {
        const jsClicked = await this.clickByScript(selector);
        if (jsClicked) {
          console.log(`[ClickPostPage] 印字ボタンJavaScriptクリック成功: ${selector}`);
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      const currentUrl = this.page.url?.() ?? 'unknown';
      throw new Error(`印字ボタンを検出できませんでした (currentUrl=${currentUrl})`);
    }
  }

  private async extractTrackingNumber(): Promise<string> {
    // ダウンロード後のページ遷移を待機
    await this.page.waitForLoadState?.('domcontentloaded');

    const trackingSelectors = [
      '#tracking-number',
      '#tracking_number',
      '.tracking-number',
      '[data-tracking-number]',
      'span:has-text("追跡番号")',
    ];

    // セレクタから追跡番号を取得
    for (const selector of trackingSelectors) {
      try {
        const text = await this.page.textContent(selector);
        const trimmed = text?.trim();
        if (trimmed && /^[A-Z0-9-]+$/i.test(trimmed)) {
          return trimmed;
        }
      } catch {
        // 次のセレクタを試す
      }
    }

    // ページ全体から追跡番号パターンを抽出
    if (this.page.evaluate) {
      try {
        const trackingNumber = await this.page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          // クリックポストの追跡番号パターン（例: 1234-5678-9012-3456）
          const match = bodyText.match(/\d{4}-\d{4}-\d{4}-\d{4}/);
          return match ? match[0] : null;
        }, undefined as unknown);
        if (trackingNumber) {
          return trackingNumber as string;
        }
      } catch {
        // フォールバック
      }
    }

    throw new Error('追跡番号を取得できませんでした');
  }

  private async login(credentials: ClickPostCredentials): Promise<void> {
    // クリックポストTOPの「ログイン（Amazon OAuth）」ボタン
    const opened = await this.clickIfPresent([...AMAZON_LOGIN_SELECTORS]);
    if (!opened) {
      throw new Error('Amazonログインボタンを検出できませんでした');
    }
    await this.page.waitForLoadState?.('domcontentloaded');

    if (!credentials.email || !credentials.password) {
      if (this.options.manualLogin) {
        await this.waitForLoginCompleted();
        return;
      }
      throw new Error('CLICKPOST_EMAIL / CLICKPOST_PASSWORD が設定されていません');
    }

    await this.page.waitForSelector?.('#ap_email', {
      timeout: WAIT_FOR_SELECTOR_XXLONG_MS,
      state: 'visible',
    });

    // Amazonログイン（旧フォーム互換として #email/#password も探索）
    const emailFilled =
      (await this.fillFirst(['#ap_email'], credentials.email)) ||
      (await this.fillFirst(
        ['#email', 'input[name="email"]', 'input[type="email"]'],
        credentials.email,
      ));
    if (!emailFilled) {
      throw new Error('ログインID入力欄を検出できませんでした');
    }

    // Amazonの2段階フォーム（メール入力後の continue）
    const clickedContinue = await this.clickIfPresent([
      '#continue',
      'input#continue',
      'input[type="submit"]#continue',
      'button:has-text("続行")',
    ]);
    if (clickedContinue) {
      await this.page.waitForLoadState?.('domcontentloaded');
    }

    const passwordFilled =
      (await this.fillFirst(['#ap_password'], credentials.password)) ||
      (await this.fillFirst(
        ['#password', 'input[name="password"]', 'input[type="password"]'],
        credentials.password,
      ));
    if (!passwordFilled) {
      throw new Error('パスワード入力欄を検出できませんでした');
    }

    const signedIn = await this.clickIfPresent([
      '#signInSubmit',
      'input#signInSubmit',
      'button:has-text("ログイン")',
      'text=ログイン',
    ]);
    if (!signedIn) {
      throw new Error('ログイン実行ボタンを検出できませんでした');
    }

    console.log('[ClickPostPage] ログインボタンクリック完了、同意画面チェック開始');

    // 連携同意画面が出る場合のみ押下（短いタイムアウトで素早くスキップ）
    // 同意画面は出ないケースが多いため、短いタイムアウトで即スキップする。
    const consentClicked = await this.clickIfPresent(
      ['input[name="consentApproved"]', 'button:has-text("許可")', 'button:has-text("続行")'],
      { timeout: CLICK_TIMEOUT_CONSENT_MS },
    );
    if (consentClicked) {
      console.log('[ClickPostPage] 同意画面でボタンをクリック');
      await this.page.waitForLoadState?.('domcontentloaded');
    } else {
      console.log('[ClickPostPage] 同意画面なし、スキップ');
    }

    console.log('[ClickPostPage] ログイン完了待機開始');
    // 認証番号入力（MFA）が表示された場合は、ユーザーの手動入力完了を待ってから継続する。
    await this.waitForLoginCompleted();
  }

  private async openSingleApplyForm(): Promise<void> {
    const buttonSelectors = [
      '#content #nav_box input.navi_button[data-action="click->mypage#visit"][data-url="/packages/new"][value="1件申込"]',
      'input.navi_button[data-action="click->mypage#visit"][data-url="/packages/new"]',
      'input[type="submit"][value="1件申込"]',
      'input.navi_button[data-url="/packages/new"]',
      'text=1件申込',
    ] as const;

    // 遷移待機のタイムアウト（サイトが遅い場合を考慮して長めに設定）
    // ボタンが表示されるまで待機
    if (this.page.waitForSelector) {
      for (const selector of buttonSelectors) {
        try {
          await this.page.waitForSelector(selector, {
            timeout: WAIT_FOR_SELECTOR_XLONG_MS,
            state: 'visible',
          });
          break;
        } catch {
          // 次のセレクタを試す
        }
      }
    }

    // 最大3回クリックを試行
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Playwrightのclickを試行
      const clicked = await this.clickIfPresent([...buttonSelectors]);
      if (!clicked) {
        // JavaScriptでのクリックを試行
        const clickedByScript = await this.clickByScript(buttonSelectors[1]);
        if (!clickedByScript) {
          if (attempt === maxAttempts) {
            throw new Error('1件申込ボタンを検出できませんでした');
          }
          await new Promise((resolve) => setTimeout(resolve, CLICK_TIMEOUT_DEFAULT_MS));
          continue;
        }
      }

      // クリック後の遷移を待機
      const transitioned = await this.waitForApplyFormReady(APPLY_FORM_TRANSITION_TIMEOUT_MS);
      if (transitioned) {
        return;
      }

      // 遷移しなかった場合、少し待ってからリトライ
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, CLICK_TIMEOUT_DEFAULT_MS));
      }
    }

    // 全ての試行が失敗した場合のみ直接URLナビゲーション
    // セッションクッキーが有効なはずなので、直接遷移を試みる
    try {
      await this.page.goto('https://clickpost.jp/packages/new', { timeout: PAGE_GOTO_TIMEOUT_MS });
      await this.page.waitForLoadState?.('domcontentloaded');
      const ready = await this.waitForApplyFormReady(APPLY_FORM_TRANSITION_TIMEOUT_MS);
      if (ready) {
        return;
      }
    } catch (gotoError) {
      // gotoが失敗した場合は下のエラーに統合
      console.warn('[ClickPostPage] 直接URLナビゲーションに失敗:', gotoError);
    }

    const currentUrl = this.page.url?.() ?? 'unknown';
    throw new Error(`1件申込後に入力フォームへ遷移できませんでした (currentUrl=${currentUrl})`);
  }

  private async clickByScript(selector: string): Promise<boolean> {
    if (!this.page.evaluate) {
      return false;
    }
    try {
      const clicked = await this.page.evaluate((s) => {
        const element = document.querySelector<HTMLInputElement>(s);
        if (!element) {
          return false;
        }
        element.click();
        return true;
      }, selector);
      return Boolean(clicked);
    } catch {
      return false;
    }
  }

  private async fillOrder(order: Order): Promise<void> {
    await this.fillRequiredField(
      [
        '#zip',
        '#postal-code',
        '#postal_code',
        'input[name="package[zip]"]',
        'input[name="postal_code"]',
        'input[name="zip"]',
        'input[name*="zip"]',
        'input[id*="zip"]',
      ],
      order.buyer.address.postalCode.toString(),
      '郵便番号',
    );
    await this.fillRequiredField(
      [
        '#package_receiver_address',
        '#address',
        '#address1',
        '#receiver-address',
        'textarea[name="package[receiver_address]"]',
        'input[name="address"]',
        'input[name*="address"]',
        'textarea[name="address"]',
      ],
      this.buildReceiverAddress(order),
      '住所',
    );
    await this.fillRequiredField(
      [
        '#package_receiver_name',
        '#name',
        '#receiver-name',
        'input[name="package[receiver_name]"]',
        'input[name="name"]',
        'input[name*="name"]',
      ],
      order.buyer.name.toString(),
      '氏名',
    );
    await this.ensureAddressSaveChecked();
    await this.fillRequiredField(
      [
        '#package_print_title',
        '#contents',
        '#content',
        '#item-name',
        'input[name="package[print_title]"]',
        'input[name="contents"]',
        'textarea[name="contents"]',
        'input[name*="item"]',
      ],
      order.clickPostItemName,
      '内容品',
    );

    // 「次へ」ボタンをクリック
    const nextButtonSelectors = [
      'input[type="submit"][name="new_confirm"][value="次へ"]',
      'input[name="new_confirm"][value="次へ"]',
      'input[type="submit"][value="次へ"]',
      'button:has-text("次へ")',
      'text=次へ',
    ];

    console.log('[ClickPostPage] フォーム入力完了、「次へ」ボタンをクリック');

    // ボタンが表示されるまで待機
    if (this.page.waitForSelector) {
      for (const selector of nextButtonSelectors) {
        try {
          await this.page.waitForSelector(selector, {
            timeout: WAIT_FOR_SELECTOR_LONG_MS,
            state: 'visible',
          });
          break;
        } catch {
          // 次のセレクタを試す
        }
      }
    }

    const advanced = await this.clickIfPresent(nextButtonSelectors);
    if (!advanced) {
      // JavaScriptでのクリックを試行
      const clickedByScript = await this.clickByScript(nextButtonSelectors[0]);
      if (!clickedByScript) {
        const currentUrl = this.page.url?.() ?? 'unknown';
        throw new Error(`次へボタンを検出できませんでした (currentUrl=${currentUrl})`);
      }
    }

    // ページ遷移または状態変化を待機
    await this.page.waitForLoadState?.('domcontentloaded');

    // 少し待ってからバリデーションエラーをチェック
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
    const bodyText = await this.page.textContent('body');
    if (bodyText?.includes('入力してください') || bodyText?.includes('必須')) {
      console.log('[ClickPostPage] 警告: フォームにバリデーションエラーがある可能性があります');
    }

    console.log(`[ClickPostPage] 「次へ」クリック後のURL: ${this.page.url?.() ?? 'unknown'}`);
  }

  private buildReceiverAddress(order: Order): string {
    const address = order.buyer.address;
    const line1 = this.limitLineLength(
      [address.prefecture.toString(), address.city, address.street].join('').trim(),
    );
    const building = address.building?.trim();
    if (!building) {
      return line1;
    }

    // 仕様: 建物名がある場合は2行目に入力する
    const line2 = this.limitLineLength(building);
    return `${line1}\n${line2}`;
  }

  private async readDownloadAsBase64(download: PlaywrightDownloadLike): Promise<string> {
    const stream = await download.createReadStream();
    if (!stream) {
      throw new Error('PDFストリームを取得できませんでした');
    }

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve());
      stream.on('error', (error) => reject(error));
    });

    if (chunks.length === 0) {
      throw new Error('PDFデータが空です');
    }

    return Buffer.concat(chunks).toString('base64');
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

  private async fillRequiredField(
    selectors: string[],
    value: string,
    fieldLabel: string,
  ): Promise<void> {
    const filled = await this.fillFirst(selectors, value);
    if (!filled) {
      const currentUrl = this.page.url?.() ?? 'unknown';
      throw new Error(`${fieldLabel}の入力欄を検出できませんでした (currentUrl=${currentUrl})`);
    }
  }

  private async clickIfPresent(
    selectors: string[],
    options?: { timeout?: number },
  ): Promise<boolean> {
    const timeout = options?.timeout ?? CLICK_TIMEOUT_DEFAULT_MS;
    for (const selector of selectors) {
      try {
        await this.page.click(selector, { timeout });
        return true;
      } catch {
        // try next selector
      }
    }
    return false;
  }

  private async waitForLoginCompleted(): Promise<void> {
    const startAt = Date.now();
    const timeout = this.options.manualLoginTimeoutMs ?? MANUAL_LOGIN_TIMEOUT_MS;
    let lastLoggedUrl = '';
    let mfaLoggedOnce = false;

    while (Date.now() - startAt < timeout) {
      const currentUrl = this.page.url?.() ?? '';

      // デバッグ: URL変化をログ出力
      if (currentUrl !== lastLoggedUrl) {
        console.log(`[ClickPostPage] URL変化検出: ${currentUrl}`);
        lastLoggedUrl = currentUrl;
      }

      // マイページに到達したかチェック（複数パターン対応）
      const isOnMypage =
        currentUrl.includes('/mypage/index') ||
        currentUrl.includes('/mypage') ||
        (currentUrl.includes('clickpost.jp') && currentUrl.endsWith('/mypage'));

      if (isOnMypage) {
        console.log('[ClickPostPage] マイページ到達を検出');
        // 「1件申込」ボタンが表示されるまで待機（短めのタイムアウトで素早く検出）
        if (this.page.waitForSelector) {
          try {
            await this.page.waitForSelector('input[type="submit"][value="1件申込"]', {
              timeout: WAIT_FOR_SELECTOR_LONG_MS,
              state: 'visible',
            });
            console.log('[ClickPostPage] 1件申込ボタン検出完了');
          } catch {
            // ボタンがまだ表示されていなくても継続（ページ読み込み中の可能性）
          }
        }
        return;
      }

      // Amazon MFA/認証番号画面かどうかをチェック（URLベースで高速判定）
      const isOnMfaPage =
        currentUrl.includes('ap/mfa') ||
        currentUrl.includes('ap/cvf') ||
        currentUrl.includes('ap/challenge');

      if (isOnMfaPage) {
        if (!mfaLoggedOnce) {
          console.log('[ClickPostPage] MFA/認証画面検出、手動入力を待機中...');
          mfaLoggedOnce = true;
        }
        // MFA画面は短い間隔でポーリングして復帰を早く検出する。
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_FAST_MS));
        continue;
      }

      // テキストベースでのMFAチェック（URLで判定できない場合のフォールバック）
      if (!mfaLoggedOnce) {
        const bodyText = await this.page.textContent('body');
        if (
          bodyText?.includes('認証番号') ||
          bodyText?.includes('ワンタイムパスワード') ||
          bodyText?.includes('確認コード')
        ) {
          console.log('[ClickPostPage] MFA/認証画面検出（テキスト）、手動入力を待機中...');
          mfaLoggedOnce = true;
        }
      }

      // ボタンの存在チェック（マイページ以外でも表示される場合の対応）
      if (this.page.waitForSelector) {
        try {
          await this.page.waitForSelector('input[type="submit"][value="1件申込"]', {
            timeout: CLICK_TIMEOUT_CONSENT_MS,
            state: 'visible',
          });
          console.log('[ClickPostPage] 1件申込ボタンを検出（URL待機を省略）');
          return;
        } catch {
          // ボタンが見つからない場合は継続
        }
      }

      // ポーリング間隔を短縮（500ms）
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_FAST_MS));
    }
    throw new Error('手動ログインの完了待機がタイムアウトしました');
  }

  private async waitForApplyFormReady(timeoutMs: number): Promise<boolean> {
    const startAt = Date.now();
    // 入力フォームの存在を示すセレクタ候補
    const formReadySelectors = [
      '#zip',
      '#postal-code',
      '#postal_code',
      'input[name="package[zip]"]',
      '#package_receiver_name',
      'input[name="package[receiver_name]"]',
    ];

    while (Date.now() - startAt < timeoutMs) {
      // URLで判定
      const currentUrl = this.page.url?.() ?? '';
      if (currentUrl.includes('/packages/new')) {
        // URLが正しい場合、フォーム要素の存在も確認
        if (this.page.waitForSelector) {
          for (const selector of formReadySelectors) {
            try {
              await this.page.waitForSelector(selector, {
                timeout: WAIT_FOR_SELECTOR_MEDIUM_MS,
                state: 'visible',
              });
              return true;
            } catch {
              // 次のセレクタを試す
            }
          }
        }
        // URLは正しいがセレクタが見つからない場合、少し待機して再チェック
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
        continue;
      }

      // フォームセレクタでの判定（URLが変わらないSPA遷移対応）
      if (this.page.waitForSelector) {
        for (const selector of formReadySelectors) {
          try {
            await this.page.waitForSelector(selector, {
              timeout: WAIT_FOR_SELECTOR_SHORT_MS,
              state: 'visible',
            });
            return true;
          } catch {
            // 次のセレクタを試す
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
    }
    return false;
  }

  private limitLineLength(value: string): string {
    // クリックポスト住所入力の仕様: 1行あたり最大20文字まで。
    return [...value].slice(0, ADDRESS_LINE_MAX_LENGTH).join('');
  }

  private async ensureAddressSaveChecked(): Promise<void> {
    const selector = '#package_save_address';
    if (this.page.evaluate) {
      try {
        const changed = await this.page.evaluate((s) => {
          const checkbox = document.querySelector<HTMLInputElement>(s);
          if (!checkbox) {
            return false;
          }
          if (!checkbox.checked) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('input', { bubbles: true }));
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return true;
        }, selector);
        if (changed) {
          return;
        }
      } catch {
        // fallback to click
      }
    }

    await this.clickIfPresent([selector]);
  }
}

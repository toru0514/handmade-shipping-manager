import { describe, expect, it, vi } from 'vitest';
import { MinnePage, MinnePlaywrightPageLike } from '../MinnePage';

// ---------------------------------------------------------------------------
// ページモックファクトリ
// ---------------------------------------------------------------------------

interface PageMockOptions {
  /** waitForSelector が成功する（=DOM に存在する）セレクタ */
  resolvedSelectors?: Set<string>;
  /** innerText の戻り値マップ */
  innerTextMap?: Record<string, string>;
  /** textContent の戻り値マップ */
  textContentMap?: Record<string, string>;
}

function createPageMock(options: PageMockOptions = {}): MinnePlaywrightPageLike & {
  goto: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
} {
  const { resolvedSelectors = new Set<string>(), innerTextMap = {}, textContentMap = {} } = options;

  return {
    goto: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    waitForLoadState: vi.fn(async () => undefined),
    waitForSelector: vi.fn(async (selector: string) => {
      if (!resolvedSelectors.has(selector)) {
        throw new Error(`Selector not found in mock: ${selector}`);
      }
      return null;
    }),
    innerText: vi.fn(async (selector: string) => innerTextMap[selector] ?? ''),
    textContent: vi.fn(async (selector: string) => textContentMap[selector] ?? null),
  };
}

/** fetchOrderData が最低限動くページモックを生成するヘルパー */
function createOrderPageMock(options: {
  deliveryText: string;
  productName?: string;
  productOption?: string;
  price?: string;
  orderedAt?: string;
}) {
  const deliverySelector = 'h3:has-text("配送先情報") + .p-content-section__body > div';
  const productNameSelector = '.p-order-product__name a';
  const productOptionSelector = '.p-order-product__custom-detail';
  const orderedAtSelector = 'dt:has-text("注文日") + dd';

  const resolvedSelectors = new Set<string>([deliverySelector]);
  const innerTextMap: Record<string, string> = { [deliverySelector]: options.deliveryText };
  const textContentMap: Record<string, string> = {};

  if (options.productName !== undefined) {
    resolvedSelectors.add(productNameSelector);
    textContentMap[productNameSelector] = options.productName;
  }
  if (options.productOption !== undefined) {
    resolvedSelectors.add(productOptionSelector);
    textContentMap[productOptionSelector] = options.productOption;
  }
  if (options.orderedAt !== undefined) {
    resolvedSelectors.add(orderedAtSelector);
    textContentMap[orderedAtSelector] = options.orderedAt;
  }

  return createPageMock({ resolvedSelectors, innerTextMap, textContentMap });
}

// ---------------------------------------------------------------------------
// sendLoginLink
// ---------------------------------------------------------------------------

describe('MinnePage.sendLoginLink', () => {
  it('ログインページに遷移してメール入力・送信ボタンクリックを行う', async () => {
    const page = createPageMock({
      resolvedSelectors: new Set([
        'input[type="email"]',
        'button:has-text("ログインリンクを送信")',
      ]),
    });

    const minnePage = new MinnePage(page);
    await minnePage.sendLoginLink('test@example.com');

    expect(page.goto).toHaveBeenCalledWith('https://minne.com/users/sign_in');
    expect(page.fill).toHaveBeenCalledWith('input[type="email"]', 'test@example.com');
    expect(page.click).toHaveBeenCalledWith('button:has-text("ログインリンクを送信")');
  });

  it('メールアドレス入力欄が見つからない場合はエラー', async () => {
    const page = createPageMock({ resolvedSelectors: new Set() });

    const minnePage = new MinnePage(page);
    await expect(minnePage.sendLoginLink('test@example.com')).rejects.toThrow(
      'メールアドレス の入力欄が見つかりませんでした',
    );
  });

  it('ページにエラーメッセージが表示されている場合はエラー', async () => {
    const page = createPageMock({
      resolvedSelectors: new Set([
        'input[type="email"]',
        'button:has-text("ログインリンクを送信")',
        '.flash--error',
      ]),
      textContentMap: { '.flash--error': 'メールアドレスが正しくありません' },
    });

    const minnePage = new MinnePage(page);
    await expect(minnePage.sendLoginLink('bad@example.com')).rejects.toThrow(
      'minne画面でエラーを検出しました: メールアドレスが正しくありません',
    );
  });
});

// ---------------------------------------------------------------------------
// openLoginLink
// ---------------------------------------------------------------------------

describe('MinnePage.openLoginLink', () => {
  it('指定されたマジックリンクURLに遷移する', async () => {
    const page = createPageMock({ resolvedSelectors: new Set() });

    const minnePage = new MinnePage(page);
    await minnePage.openLoginLink('https://minne.com/users/sign_in/magic_link/abc123');

    expect(page.goto).toHaveBeenCalledWith('https://minne.com/users/sign_in/magic_link/abc123');
  });
});

// ---------------------------------------------------------------------------
// fetchOrderData — 配送先パース（TEL 行あり）
// ---------------------------------------------------------------------------

describe('MinnePage.fetchOrderData — 配送先パース', () => {
  it('TEL 行がある場合は逆算パースで購入者情報を返す', async () => {
    const page = createOrderPageMock({
      // 実際の minne 配送先ブロックの innerText 形式
      deliveryText:
        '〒220-0073\n神奈川県横浜市西区岡野 1-1-17 ベイシス横濱岡野1階\n篠原 有里\nTEL：0468617084',
      productName: 'ハンドメイドピアス',
      orderedAt: '2026/02/22',
    });

    const result = await new MinnePage(page).fetchOrderData('53611843');

    expect(result.orderId).toBe('53611843');
    expect(result.buyerName).toBe('篠原 有里');
    expect(result.buyerPostalCode).toBe('2200073');
    expect(result.buyerPrefecture).toBe('神奈川県');
    expect(result.buyerCity).toBe('横浜市西区');
    expect(result.buyerAddress1).toBe('岡野');
    expect(result.buyerAddress2).toBe('1-1-17 ベイシス横濱岡野1階');
    expect(result.buyerPhone).toBe('0468617084');
    expect(result.productName).toBe('ハンドメイドピアス');
    expect(result.orderedAt).toEqual(new Date(2026, 1, 22));
  });

  it('TEL 行がない場合は末尾から逆算してパースする', async () => {
    const page = createOrderPageMock({
      deliveryText: '〒150-0001\n東京都渋谷区神宮前1-2-3\n山田 花子',
      productName: 'リングピアス',
      orderedAt: '2026/01/10',
    });

    const result = await new MinnePage(page).fetchOrderData('99999');

    expect(result.buyerName).toBe('山田 花子');
    expect(result.buyerPostalCode).toBe('1500001');
    expect(result.buyerPrefecture).toBe('東京都');
    expect(result.buyerCity).toBe('渋谷区');
    expect(result.buyerAddress1).toBe('神宮前1-2-3');
    expect(result.buyerPhone).toBeUndefined();
  });

  it('建物名がある場合は buyerAddress2 に格納される', async () => {
    const page = createOrderPageMock({
      deliveryText:
        '〒530-0001\n大阪府大阪市北区梅田1丁目 2-3 サンプルビル5F\n田中 一郎\nTEL：0612345678',
      productName: 'ブレスレット',
    });

    const result = await new MinnePage(page).fetchOrderData('11111');

    expect(result.buyerCity).toBe('大阪市北区');
    expect(result.buyerAddress1).toBe('梅田1丁目');
    expect(result.buyerAddress2).toBe('2-3 サンプルビル5F');
  });

  it('配送先ブロックが取得できない場合はエラー', async () => {
    const page = createPageMock({ resolvedSelectors: new Set() });

    await expect(new MinnePage(page).fetchOrderData('12345')).rejects.toThrow(
      '配送先情報ブロックを取得できませんでした',
    );
  });

  it('innerText が未定義の場合は textContent にフォールバック', async () => {
    const deliverySelector = 'h3:has-text("配送先情報") + .p-content-section__body > div';
    const productSelector = '.p-order-product__name a';
    const page: MinnePlaywrightPageLike = {
      goto: vi.fn(async () => undefined),
      fill: vi.fn(async () => undefined),
      click: vi.fn(async () => undefined),
      waitForLoadState: vi.fn(async () => undefined),
      waitForSelector: vi.fn(async (selector: string) => {
        if (selector !== deliverySelector && selector !== productSelector) {
          throw new Error('not found');
        }
        return null;
      }),
      // innerText を意図的に未定義にして textContent フォールバックを検証
      textContent: vi.fn(async (selector: string) => {
        if (selector === deliverySelector) {
          return '〒100-0001\n東京都千代田区丸の内1-1-1\n佐藤 次郎\nTEL：0312345678';
        }
        if (selector === productSelector) return 'ネックレス';
        return null;
      }),
    };

    const result = await new MinnePage(page).fetchOrderData('22222');

    expect(result.buyerName).toBe('佐藤 次郎');
    expect(result.productName).toBe('ネックレス');
  });
});

// ---------------------------------------------------------------------------
// fetchOrderData — 商品名・オプション・金額・日付パース
// ---------------------------------------------------------------------------

describe('MinnePage.fetchOrderData — 商品・日付パース', () => {
  it('商品オプションがある場合は「商品名(オプション値)」形式になる', async () => {
    const page = createOrderPageMock({
      deliveryText: '〒150-0001\n東京都渋谷区神宮前1-2-3\n山田 花子\nTEL：09012345678',
      productName: 'イヤーカフ',
      productOption: 'イヤーカフサイズ(金/銀箔)：三角M(金箔) (0円)',
      orderedAt: '2026/02/22',
    });

    const result = await new MinnePage(page).fetchOrderData('33333');

    expect(result.productName).toBe('イヤーカフ(三角M(金箔))');
  });

  it('商品オプションがない場合はそのまま商品名を返す', async () => {
    const page = createOrderPageMock({
      deliveryText: '〒150-0001\n東京都渋谷区神宮前1-2-3\n山田 花子\nTEL：09012345678',
      productName: 'シンプルリング',
      orderedAt: '2026/02/22',
    });

    const result = await new MinnePage(page).fetchOrderData('44444');

    expect(result.productName).toBe('シンプルリング');
  });

  it.each([
    ['2026/02/22', new Date(2026, 1, 22)],
    ['2026年2月22日', new Date(2026, 1, 22)],
    ['2026-02-22', new Date(2026, 1, 22)],
  ])('注文日フォーマット "%s" をパースできる', async (rawDate, expected) => {
    const page = createOrderPageMock({
      deliveryText: '〒150-0001\n東京都渋谷区神宮前1-2-3\n山田 花子',
      orderedAt: rawDate,
    });

    const result = await new MinnePage(page).fetchOrderData('55555');

    expect(result.orderedAt).toEqual(expected);
  });

  it('金額テキストから数値を取得できる', async () => {
    const priceSelector = 'dt:has-text("商品金額") + dd';
    const deliverySelector = 'h3:has-text("配送先情報") + .p-content-section__body > div';
    const page = createPageMock({
      resolvedSelectors: new Set([deliverySelector, priceSelector]),
      innerTextMap: {
        [deliverySelector]: '〒150-0001\n東京都渋谷区神宮前1-2-3\n山田 花子',
      },
      textContentMap: { [priceSelector]: '¥1,500' },
    });

    const result = await new MinnePage(page).fetchOrderData('66666');

    expect(result.price).toBe(1500);
  });
});

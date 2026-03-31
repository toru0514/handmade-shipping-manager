export type DescriptionGenerationInput = {
  readonly woodNames: string[];
  readonly woodFeatures: string[];
  readonly productCharacteristics: string;
  readonly template?: string;
};

export const DEFAULT_TEMPLATE = `木のぬくもりと、最高の幸せをあなたに。

指先にそっと寄り添うような、あたたかく、やさしい{商品の特徴}を。
深みのある木材「{木材名}」と、ひと粒のクリスタルが光る
"心まで満たされる"ウッド{商品の特徴}が誕生しました。

■ さりげなく、でも印象的に
「木の{商品の特徴}だけじゃちょっと物足りない」
「でも金属のような冷たさは避けたい」
そんなあなたへ。

ナチュラルな木の質感に、控えめに輝くクリスタルを添えることで、
どんなシーンでも手元を美しく彩ります。

■ 素材の魅力：{木材名}
{木材の特徴}

使い込むほどに味わいが増し、経年変化を楽しめるのも魅力のひとつです。

■ 着け心地とデザイン
・肌なじみの良い、あたたかな木の質感
・軽やかな装着感
・和装、スーツ、カジュアルなど、どんなスタイルにもフィット
・入学式・卒業式などフォーマルな場面でも活躍

■ サイズ・付属品・仕様
・サイズ展開：3号〜25号（それ以外のサイズもご相談ください）
・厚み：約4mm
・付属品：リングケース／専用ポーチ／お手入れクロス付き
・艶出し剤不使用。十数種類の研磨で自然な光沢に仕上げています
・生活防水仕様（水に濡れた際はタオルで拭き、陰干しで長持ちします）

■ ご注文前にご確認ください
・天然素材・手作業のため、木目や色合いに個体差があります
・「在庫あり」と表示されていても、ご注文後の制作となる場合がございます
・発送までの日数は目安であり、到着日は異なることがあります
・強い衝撃で破損する恐れがありますので、無理な力はお控えください
・商品は1点の価格です（セット販売ではありません）

日々をともに過ごす手元に、木のぬくもりを。
あなたにとっての"特別"になりますように。`;

/**
 * テンプレート内のプレースホルダーを実際の値に置換する。
 *
 * 対応プレースホルダー:
 * - {木材名} — 選択された木材名（複数の場合は「・」区切り）
 * - {木材の特徴} — 木材管理に登録された特徴テキスト
 * - {商品の特徴} — ユーザーが入力した商品の特徴
 */
export function applyTemplate(
  template: string,
  input: {
    woodNames: string[];
    woodFeatures: string[];
    productCharacteristics: string;
  },
): string {
  const woodNameText = input.woodNames.join('・');
  const woodFeatureText = input.woodFeatures.filter(Boolean).join('\n');

  return template
    .replace(/\{木材名\}/g, woodNameText)
    .replace(/\{木材の特徴\}/g, woodFeatureText)
    .replace(/\{商品の特徴\}/g, input.productCharacteristics);
}

/**
 * テンプレート置換後のドラフトをAIで自然な文章に整えるプロンプトを構築する。
 */
export function buildPolishPrompt(draftText: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `あなたはハンドメイド木工アクセサリーのEC販売に特化した文章校正者です。

渡されたドラフト文章を、以下のルールに従って自然で魅力的な商品説明文に整えてください:
- 文章の構成・段落の分け方・セクション構成・全体の流れはそのまま維持する
- 不自然な表現や繋がりの悪い箇所だけを最小限に修正する
- 木材の質感・色合いの描写が具体的であればそのまま活かす
- 文字数は元のドラフトとほぼ同じに保つ
- 商品説明文のみを出力する（挨拶や前置き、解説コメントは不要）
- 元の文章が十分自然であれば、ほぼそのまま出力してよい`;

  const userPrompt = `以下のドラフト文章を自然な商品説明文に整えてください。構成やセクションの順序は変えないでください。

${draftText}`;

  return { systemPrompt, userPrompt };
}

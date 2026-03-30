export type DescriptionGenerationInput = {
  readonly woodNames: string[];
  readonly woodFeatures: string[];
  readonly productCharacteristics: string;
  readonly referenceExample?: string;
};

/**
 * テンプレート内のプレースホルダーを実際の値に置換する。
 *
 * 対応プレースホルダー:
 * - {木材名} — 選択された木材名（複数の場合はカンマ区切り）
 * - {木材の特徴} — 木材の特徴説明（複数の場合は改行区切り）
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
  const woodNameText = input.woodNames.join('、');
  const woodFeatureText = input.woodNames
    .map((name, i) => {
      const features = input.woodFeatures[i];
      return features ? `${name}: ${features}` : name;
    })
    .join('\n');

  return template
    .replace(/\{木材名\}/g, woodNameText)
    .replace(/\{木材の特徴\}/g, woodFeatureText)
    .replace(/\{商品の特徴\}/g, input.productCharacteristics);
}

/**
 * テンプレート置換後のテキストをAIで自然な文章に整えるプロンプトを構築する。
 */
export function buildPolishPrompt(draftText: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `あなたはハンドメイド木工アクセサリーのEC販売に特化した文章校正者です。

渡されたドラフト文章を、以下のルールに従って自然で魅力的な商品説明文に整えてください:
- 文章の構成・段落の分け方・全体の流れはそのまま維持する
- 不自然な表現や繋がりの悪い箇所だけを最小限に修正する
- 木材の質感・色合いの描写をより具体的にする
- 文字数は元のドラフトとほぼ同じに保つ
- 商品説明文のみを出力する（挨拶や前置き、説明は不要）
- 元の文章が十分自然であれば、ほぼそのまま出力してよい`;

  const userPrompt = `以下のドラフト文章を自然な商品説明文に整えてください。構成は変えないでください。

${draftText}`;

  return { systemPrompt, userPrompt };
}

/**
 * 参考例なし（テンプレートなし）の場合、ゼロから生成するプロンプトを構築する。
 */
export function buildFreeGenerationPrompt(input: DescriptionGenerationInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `あなたはハンドメイド木工アクセサリーのEC販売に特化した商品説明文のライターです。
温かみのある丁寧な文体で、木材の特徴を活かした魅力的な商品説明を書いてください。

以下のルールを守ってください:
- 200〜400文字程度で簡潔にまとめる
- 木材の質感・色合い・手触りを具体的に描写する
- 購入者の使用シーンや身につけたときの印象をイメージさせる
- 過度な装飾語は避け、自然で読みやすい日本語にする
- 商品説明文のみを出力する（挨拶や前置きは不要）`;

  const woodSection = input.woodNames
    .map((name, i) => {
      const features = input.woodFeatures[i];
      return features ? `${name}: ${features}` : name;
    })
    .join('\n');

  const userPrompt = `以下の情報を基に商品説明文を作成してください。

【使用木材】
${woodSection}

【商品の特徴】
${input.productCharacteristics}`;

  return { systemPrompt, userPrompt };
}

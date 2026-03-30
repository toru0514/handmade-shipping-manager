export type DescriptionGenerationInput = {
  readonly woodNames: string[];
  readonly woodFeatures: string[];
  readonly productCharacteristics: string;
  readonly referenceExample?: string;
};

export function buildDescriptionPrompt(input: DescriptionGenerationInput): {
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

  let userPrompt = `以下の情報を基に商品説明文を作成してください。

【使用木材】
${woodSection}

【商品の特徴】
${input.productCharacteristics}`;

  if (input.referenceExample?.trim()) {
    userPrompt += `

【参考にしたい文体・例文】
${input.referenceExample.trim()}`;
  }

  return { systemPrompt, userPrompt };
}

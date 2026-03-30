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
  const hasReference = !!input.referenceExample?.trim();

  const systemPrompt = hasReference
    ? `あなたはハンドメイド木工アクセサリーのEC販売に特化した商品説明文のライターです。

あなたの仕事は、参考例として渡された既存の商品説明文の「構成・文体・トーン・文章の流れ」をそのまま踏襲し、木材名・木材の特徴・商品の種類だけを新しい情報に差し替えた説明文を作成することです。

以下のルールを厳守してください:
- 参考例の文章構成（段落の分け方、話題の順序）をできるだけそのまま再現する
- 参考例の文体・語尾のスタイルを維持する
- 参考例に含まれる木材固有の描写（色、質感、模様など）を、新しい木材の特徴に置き換える
- 参考例に含まれる商品固有の描写（形状、用途など）を、新しい商品の特徴に置き換える
- 参考例とほぼ同じ文字数にする
- 商品説明文のみを出力する（挨拶や前置きは不要）`
    : `あなたはハンドメイド木工アクセサリーのEC販売に特化した商品説明文のライターです。
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

  let userPrompt: string;

  if (hasReference) {
    userPrompt = `以下の参考例の文章構成・文体をそのまま踏襲し、木材と商品の情報だけを差し替えた説明文を作成してください。

【参考例（この構成・文体を踏襲すること）】
${input.referenceExample!.trim()}

【新しい木材情報（参考例の木材部分をこれに差し替え）】
${woodSection}

【新しい商品の特徴（参考例の商品部分をこれに差し替え）】
${input.productCharacteristics}`;
  } else {
    userPrompt = `以下の情報を基に商品説明文を作成してください。

【使用木材】
${woodSection}

【商品の特徴】
${input.productCharacteristics}`;
  }

  return { systemPrompt, userPrompt };
}

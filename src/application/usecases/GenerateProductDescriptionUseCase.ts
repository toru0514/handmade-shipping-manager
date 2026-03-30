import type { TextGenerationPort } from '@/domain/ports/TextGenerationPort';
import {
  applyTemplate,
  buildPolishPrompt,
  buildFreeGenerationPrompt,
} from '@/domain/services/ProductDescriptionPromptBuilder';

export type GenerateProductDescriptionInput = {
  readonly woodNames: string[];
  readonly woodFeatures: string[];
  readonly productCharacteristics: string;
  readonly referenceExample?: string;
};

export class GenerateProductDescriptionUseCase {
  constructor(private readonly textGenerator: TextGenerationPort) {}

  async execute(input: GenerateProductDescriptionInput): Promise<string> {
    if (!input.productCharacteristics.trim()) {
      throw new Error('商品の特徴を入力してください');
    }

    if (input.woodNames.length === 0) {
      throw new Error('使用木材を選択してください');
    }

    const hasTemplate = !!input.referenceExample?.trim();

    if (hasTemplate) {
      // テンプレート方式: プレースホルダー置換 → AIで文章を整える
      const draft = applyTemplate(input.referenceExample!, {
        woodNames: input.woodNames,
        woodFeatures: input.woodFeatures,
        productCharacteristics: input.productCharacteristics,
      });

      const { systemPrompt, userPrompt } = buildPolishPrompt(draft);
      const result = await this.textGenerator.generate({
        systemPrompt,
        userPrompt,
        maxTokens: 2048,
      });

      return result.text;
    } else {
      // 自由生成方式
      const { systemPrompt, userPrompt } = buildFreeGenerationPrompt(input);
      const result = await this.textGenerator.generate({
        systemPrompt,
        userPrompt,
        maxTokens: 2048,
      });

      return result.text;
    }
  }
}

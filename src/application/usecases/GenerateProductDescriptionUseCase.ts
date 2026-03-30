import type { TextGenerationPort } from '@/domain/ports/TextGenerationPort';
import {
  applyTemplate,
  buildPolishPrompt,
  DEFAULT_TEMPLATE,
} from '@/domain/services/ProductDescriptionPromptBuilder';

export type GenerateProductDescriptionInput = {
  readonly woodNames: string[];
  readonly woodFeatures: string[];
  readonly productCharacteristics: string;
  readonly template?: string;
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

    const template = input.template?.trim() || DEFAULT_TEMPLATE;

    // テンプレートのプレースホルダーを実際の値に置換
    const draft = applyTemplate(template, {
      woodNames: input.woodNames,
      woodFeatures: input.woodFeatures,
      productCharacteristics: input.productCharacteristics,
    });

    // AIで文章を自然に整える
    const { systemPrompt, userPrompt } = buildPolishPrompt(draft);
    const result = await this.textGenerator.generate({
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
    });

    return result.text;
  }
}

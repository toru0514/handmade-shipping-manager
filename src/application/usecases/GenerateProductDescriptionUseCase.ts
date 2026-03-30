import type { TextGenerationPort } from '@/domain/ports/TextGenerationPort';
import { buildDescriptionPrompt } from '@/domain/services/ProductDescriptionPromptBuilder';

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

    const { systemPrompt, userPrompt } = buildDescriptionPrompt({
      woodNames: input.woodNames,
      woodFeatures: input.woodFeatures,
      productCharacteristics: input.productCharacteristics,
      referenceExample: input.referenceExample,
    });

    const result = await this.textGenerator.generate({
      systemPrompt,
      userPrompt,
    });

    return result.text;
  }
}

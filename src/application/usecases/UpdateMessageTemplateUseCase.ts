import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplate } from '@/domain/services/MessageGenerator';
import {
  MessageTemplateType,
  MessageTemplateTypeValue,
} from '@/domain/valueObjects/MessageTemplateType';

export interface TemplateVariableDefinition {
  readonly name: string;
  readonly label: string;
}

export const AVAILABLE_TEMPLATE_VARIABLES: Record<
  MessageTemplateTypeValue,
  readonly TemplateVariableDefinition[]
> = {
  purchase_thanks: [
    { name: 'buyer_name', label: '購入者名' },
    { name: 'product_name', label: '商品名' },
    { name: 'price', label: '金額' },
    { name: 'order_id', label: '注文番号' },
    { name: 'platform', label: 'プラットフォーム' },
  ],
  shipping_notice: [
    { name: 'buyer_name', label: '購入者名' },
    { name: 'shipping_method', label: '発送方法' },
    { name: 'tracking_number', label: '追跡番号' },
    { name: 'tracking_url', label: '追跡URL' },
    { name: 'shipped_at', label: '発送日時' },
    { name: 'product_name', label: '商品名' },
  ],
};

const SAMPLE_VALUES: Record<string, string> = {
  buyer_name: '山田 太郎',
  product_name: 'ハンドメイドアクセサリー',
  price: '¥2,500',
  order_id: 'ORD-2026-0001',
  platform: 'minne',
  shipping_method: 'クリックポスト',
  tracking_number: '1234-5678-9012',
  tracking_url:
    'https://trackings.post.japanpost.jp/services/srv/search/input?requestNo1=123456789012',
  shipped_at: '2026/02/18 10:30',
};

export interface MessageTemplateDto {
  readonly id: string;
  readonly type: MessageTemplateTypeValue;
  readonly content: string;
  readonly variables: readonly string[];
}

export interface UpdateMessageTemplateInput {
  readonly type: MessageTemplateTypeValue;
  readonly content: string;
}

function extractVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g);
  const variables = new Set<string>();

  for (const match of matches) {
    const variable = match[1];
    if (variable) {
      variables.add(variable);
    }
  }

  return [...variables];
}

function toDto(template: MessageTemplate): MessageTemplateDto {
  return {
    id: template.id,
    type: template.type.value,
    content: template.content,
    variables: template.variables.map((variable) => variable.name),
  };
}

export class UpdateMessageTemplateUseCase {
  constructor(private readonly repository: MessageTemplateRepository<MessageTemplate>) {}

  async getTemplate(typeValue: MessageTemplateTypeValue): Promise<MessageTemplateDto> {
    const type = new MessageTemplateType(typeValue);
    const template =
      (await this.repository.findByType(type)) ?? (await this.repository.resetToDefault(type));
    return toDto(template);
  }

  async updateTemplate(input: UpdateMessageTemplateInput): Promise<MessageTemplateDto> {
    const normalizedContent = input.content.trim();

    if (normalizedContent.length === 0) {
      throw new Error('テンプレートは空にできません');
    }

    const extractedVariables = extractVariables(normalizedContent);
    if (extractedVariables.length === 0) {
      throw new Error('テンプレートには最低1つの変数を含めてください');
    }

    const type = new MessageTemplateType(input.type);
    const currentTemplate = await this.repository.findByType(type);

    const templateToSave: MessageTemplate = {
      id: currentTemplate?.id ?? `custom-${type.value}`,
      type,
      content: normalizedContent,
      variables: extractedVariables.map((name) => ({ name })),
    };

    await this.repository.save(templateToSave);
    return toDto(templateToSave);
  }

  async resetToDefault(typeValue: MessageTemplateTypeValue): Promise<MessageTemplateDto> {
    const type = new MessageTemplateType(typeValue);
    const template = await this.repository.resetToDefault(type);
    return toDto(template);
  }

  preview(input: UpdateMessageTemplateInput): string {
    return input.content.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_match, variableName: string) => {
      return SAMPLE_VALUES[variableName] ?? '';
    });
  }
}

import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplate, TemplateVariable } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { MessageTemplateTypeValue } from '@/domain/valueObjects/MessageTemplateType';

const DEFAULT_TEMPLATES: Record<MessageTemplateTypeValue, Omit<MessageTemplate, 'type'>> = {
  purchase_thanks: {
    id: 'default-purchase-thanks',
    content: `{{buyer_name}} 様\n\nこの度は「{{product_name}}」をご購入いただき、誠にありがとうございます。\n\n心を込めてお作りした作品です。\n発送準備が整いましたら、改めてご連絡いたします。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n今後ともよろしくお願いいたします。`,
    variables: [{ name: 'buyer_name' }, { name: 'product_name' }],
  },
  shipping_notice: {
    id: 'default-shipping-notice',
    content: `{{buyer_name}} 様\n\nお待たせいたしました。\n本日、{{shipping_method}}にて発送いたしました。\n\n追跡番号: {{tracking_number}}\n追跡URL: {{tracking_url}}\n\n届きましたら、ご確認をお願いいたします。\n\nこの度はご購入いただき、ありがとうございました。\nまたのご利用を心よりお待ちしております。`,
    variables: [
      { name: 'buyer_name' },
      { name: 'shipping_method' },
      { name: 'tracking_number' },
      { name: 'tracking_url' },
    ],
  },
};

function cloneVariables(variables: TemplateVariable[]): TemplateVariable[] {
  return variables.map((variable) => ({ name: variable.name }));
}

function buildDefaultTemplate(type: MessageTemplateType): MessageTemplate {
  const base = DEFAULT_TEMPLATES[type.value];

  return {
    id: base.id,
    type,
    content: base.content,
    variables: cloneVariables(base.variables),
  };
}

export class DefaultMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  async findByType(type: MessageTemplateType): Promise<MessageTemplate | null> {
    return buildDefaultTemplate(type);
  }

  async save(_template: MessageTemplate): Promise<void> {
    return Promise.resolve();
  }

  async resetToDefault(type: MessageTemplateType): Promise<MessageTemplate> {
    return buildDefaultTemplate(type);
  }
}

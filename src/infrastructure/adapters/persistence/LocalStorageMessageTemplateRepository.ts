import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplate, TemplateVariable } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { MessageTemplateTypeValue } from '@/domain/valueObjects/MessageTemplateType';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

interface StoredMessageTemplate {
  id: string;
  type: string;
  content: string;
  variables: TemplateVariable[];
}

const STORAGE_KEY_PREFIX = 'message-template:';

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

function storageKey(type: MessageTemplateType): string {
  return `${STORAGE_KEY_PREFIX}${type.value}`;
}

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

function resolveStorage(): StorageLike {
  if (typeof globalThis.localStorage === 'undefined') {
    throw new Error('localStorage is not available in this environment');
  }

  return globalThis.localStorage;
}

export class LocalStorageMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  constructor(private readonly storage?: StorageLike) {}

  private getStorage(): StorageLike {
    return this.storage ?? resolveStorage();
  }

  async findByType(type: MessageTemplateType): Promise<MessageTemplate | null> {
    const raw = this.getStorage().getItem(storageKey(type));

    if (!raw) {
      const defaultTemplate = buildDefaultTemplate(type);
      await this.save(defaultTemplate);
      return defaultTemplate;
    }

    try {
      const parsed = JSON.parse(raw) as StoredMessageTemplate;
      return {
        id: parsed.id,
        type: new MessageTemplateType(parsed.type),
        content: parsed.content,
        variables: cloneVariables(parsed.variables),
      };
    } catch {
      console.warn(`Invalid message template JSON found for key: ${storageKey(type)}`);
      return null;
    }
  }

  async save(template: MessageTemplate): Promise<void> {
    const serialized: StoredMessageTemplate = {
      id: template.id,
      type: template.type.toString(),
      content: template.content,
      variables: cloneVariables(template.variables),
    };

    this.getStorage().setItem(storageKey(template.type), JSON.stringify(serialized));
  }

  async resetToDefault(type: MessageTemplateType): Promise<MessageTemplate> {
    const defaultTemplate = buildDefaultTemplate(type);
    await this.save(defaultTemplate);
    return defaultTemplate;
  }
}

import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplate } from '@/domain/services/MessageGenerator';
import {
  MessageTemplateType,
  MessageTemplateTypeValue,
} from '@/domain/valueObjects/MessageTemplateType';
import { SheetsClient } from '../../external/google/SheetsClient';

const COL = {
  type: 0,
  id: 1,
  content: 2,
} as const;

const DEFAULT_TEMPLATES: Record<MessageTemplateTypeValue, { id: string; content: string }> = {
  purchase_thanks: {
    id: 'default-purchase-thanks',
    content: `{{buyer_name}} 様\n\nこの度は「{{product_name}}」をご購入いただき、誠にありがとうございます。\n\n心を込めてお作りした作品です。\n発送準備が整いましたら、改めてご連絡いたします。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n今後ともよろしくお願いいたします。`,
  },
  shipping_notice: {
    id: 'default-shipping-notice',
    content: `{{buyer_name}} 様\n\nお待たせいたしました。\n本日、{{shipping_method}}にて発送いたしました。\n\n追跡番号: {{tracking_number}}\n追跡URL: {{tracking_url}}\n\n届きましたら、ご確認をお願いいたします。\n\nこの度はご購入いただき、ありがとうございました。\nまたのご利用を心よりお待ちしております。`,
  },
};

function extractVariables(content: string): { name: string }[] {
  const matches = content.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g);
  const seen = new Set<string>();
  const variables: { name: string }[] = [];
  for (const match of matches) {
    const name = match[1];
    if (name && !seen.has(name)) {
      seen.add(name);
      variables.push({ name });
    }
  }
  return variables;
}

export class SpreadsheetMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  constructor(private readonly sheetsClient: SheetsClient) {}

  async findByType(type: MessageTemplateType): Promise<MessageTemplate | null> {
    const rows = await this.sheetsClient.readRows();
    const row = rows.find((r) => (r[COL.type] ?? '').trim() === type.value);

    if (!row || !(row[COL.content] ?? '').trim()) {
      return null;
    }

    const content = row[COL.content]!;
    return {
      id: (row[COL.id] ?? '').trim() || `custom-${type.value}`,
      type,
      content,
      variables: extractVariables(content),
    };
  }

  async save(template: MessageTemplate): Promise<void> {
    const rows = await this.sheetsClient.readRows();
    const serialized = [template.type.value, template.id, template.content];
    const index = rows.findIndex((r) => (r[COL.type] ?? '').trim() === template.type.value);

    if (index >= 0) {
      rows[index] = serialized;
    } else {
      rows.push(serialized);
    }

    await this.sheetsClient.clearRows();
    await this.sheetsClient.writeRows(rows);
  }

  async resetToDefault(type: MessageTemplateType): Promise<MessageTemplate> {
    const base = DEFAULT_TEMPLATES[type.value];
    const defaultTemplate: MessageTemplate = {
      id: base.id,
      type,
      content: base.content,
      variables: extractVariables(base.content),
    };
    await this.save(defaultTemplate);
    return defaultTemplate;
  }
}

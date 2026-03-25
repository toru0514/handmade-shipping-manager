import { MessageTemplateTypeValue } from '@/domain/valueObjects/MessageTemplateType';

export const DEFAULT_TEMPLATES: Record<MessageTemplateTypeValue, { id: string; content: string }> =
  {
    purchase_thanks: {
      id: 'default-purchase-thanks',
      content: `{{buyer_name}} 様\n\nこの度は「{{product_name}}」をご購入いただき、誠にありがとうございます。\n\n心を込めてお作りした作品です。\n発送準備が整いましたら、改めてご連絡いたします。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n今後ともよろしくお願いいたします。`,
    },
    shipping_notice: {
      id: 'default-shipping-notice',
      content: `{{buyer_name}} 様\n\nお待たせいたしました。\n本日、{{shipping_method}}にて発送いたしました。\n\n追跡番号: {{tracking_number}}\n追跡URL: {{tracking_url}}\n\n届きましたら、ご確認をお願いいたします。\n\nこの度はご購入いただき、ありがとうございました。\nまたのご利用を心よりお待ちしております。`,
    },
  };

export function extractVariables(content: string): { name: string }[] {
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

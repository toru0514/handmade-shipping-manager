import { Order } from '../entities/Order';
import { Message } from '../valueObjects/Message';
import { MessageTemplateType } from '../valueObjects/MessageTemplateType';

export interface TemplateVariable {
  readonly name: string;
}

export interface MessageTemplate {
  readonly id: string;
  readonly type: MessageTemplateType;
  readonly content: string;
  readonly variables: TemplateVariable[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTrackingUrl(order: Order): string {
  if (!order.trackingNumber) {
    return '';
  }

  const trackingNumber = order.trackingNumber.toString();
  const method = order.shippingMethod?.toString();

  if (method === 'click_post') {
    return `https://trackings.post.japanpost.jp/services/srv/search/input?requestNo1=${trackingNumber}`;
  }

  if (method === 'yamato_compact') {
    return `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number00=${trackingNumber}`;
  }

  return '';
}

function buildVariables(order: Order): Record<string, string> {
  return {
    buyer_name: order.buyer.name.toString(),
    product_name: order.product.name,
    price: `¥${order.product.price.toLocaleString('ja-JP')}`,
    order_id: order.orderId.toString(),
    platform: order.platform.toString(),
    shipping_method: order.shippingMethod?.toString() ?? '',
    tracking_number: order.trackingNumber?.toString() ?? '',
    tracking_url: buildTrackingUrl(order),
    shipped_at: order.shippedAt?.toISOString() ?? '',
  };
}

export class MessageGenerator {
  generate(order: Order, template: MessageTemplate): Message {
    let content = template.content;
    const values = buildVariables(order);

    for (const variable of template.variables) {
      const value = values[variable.name] ?? '';
      const pattern = new RegExp(`\\{\\{${escapeRegExp(variable.name)}\\}\\}`, 'g');
      content = content.replace(pattern, value);
    }

    content = content.replace(/\{\{([a-z_]+)\}\}/g, '');

    return new Message(content);
  }
}

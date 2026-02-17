import { afterEach, describe, expect, it, vi } from 'vitest';
import { Order } from '../../entities/Order';
import { Address } from '../../valueObjects/Address';
import { Buyer } from '../../valueObjects/Buyer';
import { BuyerName } from '../../valueObjects/BuyerName';
import { MessageTemplateType } from '../../valueObjects/MessageTemplateType';
import { OrderId } from '../../valueObjects/OrderId';
import { Platform } from '../../valueObjects/Platform';
import { PostalCode } from '../../valueObjects/PostalCode';
import { Prefecture } from '../../valueObjects/Prefecture';
import { Product } from '../../valueObjects/Product';
import { ShippingMethod } from '../../valueObjects/ShippingMethod';
import { TrackingNumber } from '../../valueObjects/TrackingNumber';
import { MessageGenerator, MessageTemplate } from '../MessageGenerator';

describe('MessageGenerator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const createOrder = (): Order =>
    Order.create({
      orderId: new OrderId('ORD-001'),
      platform: Platform.Minne,
      buyer: new Buyer({
        name: new BuyerName('山田 太郎'),
        address: new Address({
          postalCode: new PostalCode('1500001'),
          prefecture: new Prefecture('東京都'),
          city: '渋谷区',
          street: '神宮前1-1-1',
        }),
      }),
      product: new Product({
        name: 'ハンドメイドアクセサリー',
        price: 2500,
      }),
      orderedAt: new Date('2026-02-14T00:00:00Z'),
    });

  it('テンプレート変数を置換してMessageを生成する', () => {
    const order = createOrder();
    const generator = new MessageGenerator();
    const template: MessageTemplate = {
      id: 'tmpl-1',
      type: MessageTemplateType.PurchaseThanks,
      content:
        '{{buyer_name}} 様\n{{product_name}} をご購入ありがとうございます。金額: {{price}} / 注文: {{order_id}} / {{platform}}',
      variables: [
        { name: 'buyer_name' },
        { name: 'product_name' },
        { name: 'price' },
        { name: 'order_id' },
        { name: 'platform' },
      ],
    };

    const message = generator.generate(order, template);

    expect(message.toString()).toContain('山田 太郎 様');
    expect(message.toString()).toContain('ハンドメイドアクセサリー');
    expect(message.toString()).toContain('¥2,500');
    expect(message.toString()).toContain('ORD-001');
    expect(message.toString()).toContain('minne');
  });

  it('発送関連の変数を置換できる', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T10:30:00Z'));

    const order = createOrder();
    order.markAsShipped(ShippingMethod.ClickPost, new TrackingNumber('CP123456789JP'));

    const generator = new MessageGenerator();
    const template: MessageTemplate = {
      id: 'tmpl-2',
      type: MessageTemplateType.ShippingNotice,
      content:
        '発送方法: {{shipping_method}}\n追跡番号: {{tracking_number}}\n追跡URL: {{tracking_url}}\n発送日時: {{shipped_at}}',
      variables: [
        { name: 'shipping_method' },
        { name: 'tracking_number' },
        { name: 'tracking_url' },
        { name: 'shipped_at' },
      ],
    };

    const message = generator.generate(order, template).toString();

    expect(message).toContain('click_post');
    expect(message).toContain('CP123456789JP');
    expect(message).toContain('https://trackings.post.japanpost.jp/services/srv/search/input');
    expect(message).toContain('2026-02-17T10:30:00.000Z');
  });

  it('テンプレート内の未知変数を空文字として除去する', () => {
    const order = createOrder();
    const generator = new MessageGenerator();
    const template: MessageTemplate = {
      id: 'tmpl-3',
      type: MessageTemplateType.PurchaseThanks,
      content: '確認: {{buyer_name}} / {{unknown_var}} / {{order_id}}',
      variables: [{ name: 'buyer_name' }, { name: 'order_id' }],
    };

    const message = generator.generate(order, template).toString();

    expect(message).toContain('確認: 山田 太郎');
    expect(message).toContain('ORD-001');
    expect(message).not.toContain('{{unknown_var}}');
  });
});

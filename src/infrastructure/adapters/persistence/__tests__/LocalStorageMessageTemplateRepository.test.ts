import { describe, expect, it } from 'vitest';
import { MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { LocalStorageMessageTemplateRepository } from '../LocalStorageMessageTemplateRepository';

class InMemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('LocalStorageMessageTemplateRepository', () => {
  it('findByType は未保存時に null を返す', async () => {
    const storage = new InMemoryStorage();
    const repository = new LocalStorageMessageTemplateRepository(storage);

    const found = await repository.findByType(MessageTemplateType.PurchaseThanks);

    expect(found).toBeNull();

    const raw = storage.getItem('message-template:purchase_thanks');
    expect(raw).toBeNull();
  });

  it('save/findByType で保存したテンプレートを取得できる', async () => {
    const storage = new InMemoryStorage();
    const repository = new LocalStorageMessageTemplateRepository(storage);

    const template: MessageTemplate = {
      id: 'custom-purchase-thanks',
      type: MessageTemplateType.PurchaseThanks,
      content: '{{buyer_name}} 様、ありがとうございます。',
      variables: [{ name: 'buyer_name' }],
    };

    await repository.save(template);

    const found = await repository.findByType(MessageTemplateType.PurchaseThanks);
    expect(found).not.toBeNull();
    expect(found?.id).toBe('custom-purchase-thanks');
    expect(found?.content).toBe('{{buyer_name}} 様、ありがとうございます。');
    expect(found?.variables).toEqual([{ name: 'buyer_name' }]);
  });

  it('findByType は shipping_notice 未保存時に null を返す', async () => {
    const storage = new InMemoryStorage();
    const repository = new LocalStorageMessageTemplateRepository(storage);

    const found = await repository.findByType(MessageTemplateType.ShippingNotice);

    expect(found).toBeNull();

    const raw = storage.getItem('message-template:shipping_notice');
    expect(raw).toBeNull();
  });

  it('resetToDefault は指定種別をデフォルトに戻して返す', async () => {
    const storage = new InMemoryStorage();
    const repository = new LocalStorageMessageTemplateRepository(storage);

    await repository.save({
      id: 'custom-shipping-notice',
      type: MessageTemplateType.ShippingNotice,
      content: 'custom',
      variables: [{ name: 'shipping_method' }],
    });

    const reset = await repository.resetToDefault(MessageTemplateType.ShippingNotice);

    expect(reset.id).toBe('default-shipping-notice');
    expect(reset.type.equals(MessageTemplateType.ShippingNotice)).toBe(true);
    expect(reset.content).toContain('{{shipping_method}}');

    const found = await repository.findByType(MessageTemplateType.ShippingNotice);
    expect(found?.id).toBe('default-shipping-notice');
    expect(found?.content).toContain('{{tracking_url}}');
    expect(found?.content).not.toContain('{{#if tracking_number}}');
    expect(found?.content).not.toContain('{{/if}}');
  });

  it('findByType は不正JSONを検知した場合に null を返す', async () => {
    const storage = new InMemoryStorage();
    storage.setItem('message-template:purchase_thanks', '{invalid json');

    const repository = new LocalStorageMessageTemplateRepository(storage);

    await expect(repository.findByType(MessageTemplateType.PurchaseThanks)).resolves.toBeNull();
  });
});

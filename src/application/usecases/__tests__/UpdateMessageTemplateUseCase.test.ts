import { describe, expect, it } from 'vitest';
import {
  MessageTemplateDto,
  UpdateMessageTemplateUseCase,
} from '@/application/usecases/UpdateMessageTemplateUseCase';
import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';

class InMemoryMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  private readonly store = new Map<string, MessageTemplate>();

  async findByType(type: MessageTemplateType): Promise<MessageTemplate | null> {
    return this.store.get(type.value) ?? null;
  }

  async save(template: MessageTemplate): Promise<void> {
    this.store.set(template.type.value, template);
  }

  async resetToDefault(type: MessageTemplateType): Promise<MessageTemplate> {
    const template: MessageTemplate = {
      id: `default-${type.value}`,
      type,
      content:
        type.value === 'purchase_thanks'
          ? '{{buyer_name}} 様\n{{product_name}} をありがとうございます。'
          : '{{buyer_name}} 様\n{{shipping_method}} で発送しました。',
      variables:
        type.value === 'purchase_thanks'
          ? [{ name: 'buyer_name' }, { name: 'product_name' }]
          : [{ name: 'buyer_name' }, { name: 'shipping_method' }],
    };
    this.store.set(type.value, template);
    return template;
  }
}

function toSimpleDto(template: MessageTemplateDto) {
  return {
    type: template.type,
    content: template.content,
    variables: template.variables,
  };
}

describe('UpdateMessageTemplateUseCase', () => {
  it('テンプレート取得時、未保存ならデフォルトを返す', async () => {
    const repository = new InMemoryMessageTemplateRepository();
    const useCase = new UpdateMessageTemplateUseCase(repository);

    const found = await useCase.getTemplate('purchase_thanks');

    expect(toSimpleDto(found)).toEqual({
      type: 'purchase_thanks',
      content: '{{buyer_name}} 様\n{{product_name}} をありがとうございます。',
      variables: ['buyer_name', 'product_name'],
    });
  });

  it('テンプレート更新時、変数を抽出して保存する', async () => {
    const repository = new InMemoryMessageTemplateRepository();
    const useCase = new UpdateMessageTemplateUseCase(repository);

    const saved = await useCase.updateTemplate({
      type: 'shipping_notice',
      content:
        '{{buyer_name}} 様\n{{shipping_method}} で発送しました。\n追跡番号: {{tracking_number}}',
    });

    expect(saved.type).toBe('shipping_notice');
    expect(saved.variables).toEqual(['buyer_name', 'shipping_method', 'tracking_number']);
  });

  it('DR-MSG-001: 空テンプレートは禁止', async () => {
    const repository = new InMemoryMessageTemplateRepository();
    const useCase = new UpdateMessageTemplateUseCase(repository);

    await expect(
      useCase.updateTemplate({
        type: 'purchase_thanks',
        content: '   ',
      }),
    ).rejects.toThrow('テンプレートは空にできません');
  });

  it('DR-MSG-002: 変数なしテンプレートは禁止', async () => {
    const repository = new InMemoryMessageTemplateRepository();
    const useCase = new UpdateMessageTemplateUseCase(repository);

    await expect(
      useCase.updateTemplate({
        type: 'purchase_thanks',
        content: 'この度はご購入ありがとうございます。',
      }),
    ).rejects.toThrow('テンプレートには最低1つの変数を含めてください');
  });

  it('プレビュー生成でサンプル値に置換される', () => {
    const repository = new InMemoryMessageTemplateRepository();
    const useCase = new UpdateMessageTemplateUseCase(repository);

    const preview = useCase.preview({
      type: 'purchase_thanks',
      content: '{{buyer_name}} 様\n{{product_name}} をありがとうございます。',
    });

    expect(preview).toContain('山田 太郎');
    expect(preview).toContain('ハンドメイドアクセサリー');
  });

  it('デフォルトに戻すとデフォルトテンプレートを返す', async () => {
    const repository = new InMemoryMessageTemplateRepository();
    const useCase = new UpdateMessageTemplateUseCase(repository);

    await useCase.updateTemplate({
      type: 'purchase_thanks',
      content: '{{buyer_name}} 様、ありがとうございます。',
    });

    const reset = await useCase.resetToDefault('purchase_thanks');
    expect(reset.id).toBe('default-purchase_thanks');
    expect(reset.variables).toEqual(['buyer_name', 'product_name']);
  });
});

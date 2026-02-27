import { describe, expect, it, beforeEach } from 'vitest';
import { SpreadsheetMessageTemplateRepository } from '../SpreadsheetMessageTemplateRepository';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { SheetsClient } from '@/infrastructure/external/google/SheetsClient';

class InMemorySheetsClient implements SheetsClient {
  private rows: string[][] = [];

  async readRows(): Promise<string[][]> {
    return this.rows.map((r) => [...r]);
  }

  async writeRows(rows: string[][]): Promise<void> {
    this.rows = rows.map((r) => [...r]);
  }

  async clearRows(): Promise<void> {
    this.rows = [];
  }
}

describe('SpreadsheetMessageTemplateRepository', () => {
  let sheetsClient: InMemorySheetsClient;
  let repo: SpreadsheetMessageTemplateRepository;

  beforeEach(() => {
    sheetsClient = new InMemorySheetsClient();
    repo = new SpreadsheetMessageTemplateRepository(sheetsClient);
  });

  describe('findByType', () => {
    it('シートが空の場合は null を返す', async () => {
      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);
      expect(result).toBeNull();
    });

    it('保存済みのテンプレートを返す', async () => {
      await sheetsClient.writeRows([
        ['purchase_thanks', 'my-id', '{{buyer_name}} 様\nありがとうございます。'],
      ]);

      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);

      expect(result).not.toBeNull();
      expect(result!.type.value).toBe('purchase_thanks');
      expect(result!.id).toBe('my-id');
      expect(result!.content).toBe('{{buyer_name}} 様\nありがとうございます。');
    });

    it('content が空の行は null を返す', async () => {
      await sheetsClient.writeRows([['purchase_thanks', 'my-id', '']]);
      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);
      expect(result).toBeNull();
    });

    it('別の type には null を返す', async () => {
      await sheetsClient.writeRows([['purchase_thanks', 'pt-id', '{{buyer_name}} 様']]);

      const result = await repo.findByType(MessageTemplateType.ShippingNotice);
      expect(result).toBeNull();
    });

    it('content からテンプレート変数を抽出する', async () => {
      await sheetsClient.writeRows([
        ['purchase_thanks', 'pt-id', '{{buyer_name}} 様\n{{product_name}} ありがとう'],
      ]);

      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);

      expect(result!.variables).toEqual([{ name: 'buyer_name' }, { name: 'product_name' }]);
    });
  });

  describe('save', () => {
    it('新規テンプレートを保存できる', async () => {
      await repo.save({
        id: 'custom-pt',
        type: MessageTemplateType.PurchaseThanks,
        content: '{{buyer_name}} 様、感謝します。',
        variables: [{ name: 'buyer_name' }],
      });

      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);
      expect(result!.content).toBe('{{buyer_name}} 様、感謝します。');
    });

    it('既存テンプレートを上書きできる', async () => {
      await repo.save({
        id: 'custom-pt',
        type: MessageTemplateType.PurchaseThanks,
        content: '{{buyer_name}} 旧テンプレート',
        variables: [{ name: 'buyer_name' }],
      });
      await repo.save({
        id: 'custom-pt',
        type: MessageTemplateType.PurchaseThanks,
        content: '{{buyer_name}} 新テンプレート',
        variables: [{ name: 'buyer_name' }],
      });

      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);
      expect(result!.content).toBe('{{buyer_name}} 新テンプレート');

      // 行が増えていないこと
      const rows = await sheetsClient.readRows();
      expect(rows).toHaveLength(1);
    });

    it('異なる type のテンプレートを両方保存できる', async () => {
      await repo.save({
        id: 'pt',
        type: MessageTemplateType.PurchaseThanks,
        content: '{{buyer_name}} お礼',
        variables: [{ name: 'buyer_name' }],
      });
      await repo.save({
        id: 'sn',
        type: MessageTemplateType.ShippingNotice,
        content: '{{buyer_name}} 発送しました',
        variables: [{ name: 'buyer_name' }],
      });

      const pt = await repo.findByType(MessageTemplateType.PurchaseThanks);
      const sn = await repo.findByType(MessageTemplateType.ShippingNotice);
      expect(pt!.content).toBe('{{buyer_name}} お礼');
      expect(sn!.content).toBe('{{buyer_name}} 発送しました');
    });
  });

  describe('resetToDefault', () => {
    it('デフォルトテンプレートをシートに保存して返す', async () => {
      const result = await repo.resetToDefault(MessageTemplateType.PurchaseThanks);

      expect(result.id).toBe('default-purchase-thanks');
      expect(result.content).toContain('{{buyer_name}}');
      expect(result.content).toContain('{{product_name}}');

      // シートにも保存されていること
      const fromSheet = await repo.findByType(MessageTemplateType.PurchaseThanks);
      expect(fromSheet!.content).toBe(result.content);
    });

    it('カスタムテンプレートがある場合もデフォルトで上書きできる', async () => {
      await repo.save({
        id: 'custom-pt',
        type: MessageTemplateType.PurchaseThanks,
        content: '{{buyer_name}} カスタム',
        variables: [{ name: 'buyer_name' }],
      });

      await repo.resetToDefault(MessageTemplateType.PurchaseThanks);

      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);
      expect(result!.id).toBe('default-purchase-thanks');
    });
  });
});

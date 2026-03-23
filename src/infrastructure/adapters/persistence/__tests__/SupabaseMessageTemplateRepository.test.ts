import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseMessageTemplateRepository } from '../SupabaseMessageTemplateRepository';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';

function createMockSupabase() {
  const maybeSingleFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
  const selectFn = vi.fn().mockImplementation(() => ({
    eq: eqFn,
    // findAll uses select without eq — resolve directly
    then: undefined as unknown,
  }));
  const upsertFn = vi.fn().mockResolvedValue({ error: null });
  const fromFn = vi.fn().mockReturnValue({
    select: selectFn,
    upsert: upsertFn,
  });

  return { from: fromFn, select: selectFn, eq: eqFn, maybeSingle: maybeSingleFn, upsert: upsertFn };
}

describe('SupabaseMessageTemplateRepository', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  let repo: SupabaseMessageTemplateRepository;

  beforeEach(() => {
    mock = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo = new SupabaseMessageTemplateRepository(mock as any);
  });

  describe('findByType', () => {
    it('該当する行がない場合は null を返す', async () => {
      mock.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);

      expect(result).toBeNull();
      expect(mock.from).toHaveBeenCalledWith('message_templates');
      expect(mock.select).toHaveBeenCalledWith('*');
      expect(mock.eq).toHaveBeenCalledWith('type', 'purchase_thanks');
    });

    it('該当する行がある場合は MessageTemplate を返す', async () => {
      mock.maybeSingle.mockResolvedValue({
        data: {
          id: 'tmpl-1',
          type: 'purchase_thanks',
          content: '{{buyer_name}} 様、ありがとうございます。',
          variables: [{ name: 'buyer_name' }],
        },
        error: null,
      });

      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('tmpl-1');
      expect(result!.type.value).toBe('purchase_thanks');
      expect(result!.content).toBe('{{buyer_name}} 様、ありがとうございます。');
      expect(result!.variables).toEqual([{ name: 'buyer_name' }]);
    });

    it('Supabase エラー時は例外を投げる', async () => {
      mock.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(repo.findByType(MessageTemplateType.PurchaseThanks)).rejects.toThrow(
        'findByType failed: DB error',
      );
    });
  });

  describe('findAll', () => {
    it('全テンプレートを返す', async () => {
      // findAll uses select('*') which resolves directly (no eq chain)
      mock.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'pt-1',
              type: 'purchase_thanks',
              content: '{{buyer_name}} 様',
              variables: [{ name: 'buyer_name' }],
            },
            {
              id: 'sn-1',
              type: 'shipping_notice',
              content: '{{buyer_name}} 様、発送しました',
              variables: [{ name: 'buyer_name' }],
            },
          ],
          error: null,
        }),
        upsert: mock.upsert,
      });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].type.value).toBe('purchase_thanks');
      expect(result[1].type.value).toBe('shipping_notice');
    });

    it('空の場合は空配列を返す', async () => {
      mock.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: mock.upsert,
      });

      const result = await repo.findAll();
      expect(result).toEqual([]);
    });

    it('Supabase エラー時は例外を投げる', async () => {
      mock.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        upsert: mock.upsert,
      });

      await expect(repo.findAll()).rejects.toThrow('findAll failed: DB error');
    });
  });

  describe('save', () => {
    it('テンプレートを upsert する', async () => {
      await repo.save({
        id: 'tmpl-1',
        type: MessageTemplateType.PurchaseThanks,
        content: '{{buyer_name}} 様',
        variables: [{ name: 'buyer_name' }],
      });

      expect(mock.from).toHaveBeenCalledWith('message_templates');
      expect(mock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tmpl-1',
          type: 'purchase_thanks',
          content: '{{buyer_name}} 様',
          variables: [{ name: 'buyer_name' }],
        }),
        { onConflict: 'id' },
      );
    });

    it('Supabase エラー時は例外を投げる', async () => {
      mock.upsert.mockResolvedValue({ error: { message: 'DB error' } });

      await expect(
        repo.save({
          id: 'tmpl-1',
          type: MessageTemplateType.PurchaseThanks,
          content: 'test',
          variables: [],
        }),
      ).rejects.toThrow('save failed: DB error');
    });
  });

  describe('saveAll', () => {
    it('空配列の場合は何もしない', async () => {
      await repo.saveAll([]);
      expect(mock.from).not.toHaveBeenCalled();
    });

    it('複数テンプレートを一括 upsert する', async () => {
      await repo.saveAll([
        {
          id: 'pt-1',
          type: MessageTemplateType.PurchaseThanks,
          content: '{{buyer_name}} お礼',
          variables: [{ name: 'buyer_name' }],
        },
        {
          id: 'sn-1',
          type: MessageTemplateType.ShippingNotice,
          content: '{{buyer_name}} 発送',
          variables: [{ name: 'buyer_name' }],
        },
      ]);

      expect(mock.from).toHaveBeenCalledWith('message_templates');
      expect(mock.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'pt-1', type: 'purchase_thanks' }),
          expect.objectContaining({ id: 'sn-1', type: 'shipping_notice' }),
        ]),
        { onConflict: 'id' },
      );
    });

    it('Supabase エラー時は例外を投げる', async () => {
      mock.upsert.mockResolvedValue({ error: { message: 'DB error' } });

      await expect(
        repo.saveAll([
          {
            id: 'pt-1',
            type: MessageTemplateType.PurchaseThanks,
            content: 'test',
            variables: [],
          },
        ]),
      ).rejects.toThrow('saveAll failed: DB error');
    });
  });

  describe('resetToDefault', () => {
    it('purchase_thanks のデフォルトテンプレートを保存して返す', async () => {
      const result = await repo.resetToDefault(MessageTemplateType.PurchaseThanks);

      expect(result.id).toBe('default-purchase-thanks');
      expect(result.type.value).toBe('purchase_thanks');
      expect(result.content).toContain('{{buyer_name}}');
      expect(result.content).toContain('{{product_name}}');
      expect(result.variables.length).toBeGreaterThan(0);

      // save (upsert) が呼ばれたこと
      expect(mock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default-purchase-thanks',
          type: 'purchase_thanks',
        }),
        { onConflict: 'id' },
      );
    });

    it('shipping_notice のデフォルトテンプレートを保存して返す', async () => {
      const result = await repo.resetToDefault(MessageTemplateType.ShippingNotice);

      expect(result.id).toBe('default-shipping-notice');
      expect(result.type.value).toBe('shipping_notice');
      expect(result.content).toContain('{{shipping_method}}');
      expect(result.content).toContain('{{tracking_number}}');
    });
  });
});

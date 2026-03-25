import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DualWriteMessageTemplateRepository } from '../DualWriteMessageTemplateRepository';
import type { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import type { MessageTemplate } from '@/domain/services/MessageGenerator';
import type { Logger } from '@/infrastructure/logging/Logger';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';

function createMockRepository(): MessageTemplateRepository<MessageTemplate> {
  return {
    findByType: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn(),
    resetToDefault: vi.fn(),
  };
}

function createMockLogger(): Logger {
  return { warn: vi.fn(), error: vi.fn() };
}

function createTemplate(overrides: Partial<MessageTemplate> = {}): MessageTemplate {
  return {
    id: 'tmpl-1',
    type: MessageTemplateType.PurchaseThanks,
    content: 'ご購入ありがとうございます、{{buyer_name}}様',
    variables: [{ name: 'buyer_name' }],
    ...overrides,
  };
}

describe('DualWriteMessageTemplateRepository', () => {
  let primary: MessageTemplateRepository<MessageTemplate>;
  let secondary: MessageTemplateRepository<MessageTemplate>;
  let logger: Logger;
  let repo: DualWriteMessageTemplateRepository;

  beforeEach(() => {
    primary = createMockRepository();
    secondary = createMockRepository();
    logger = createMockLogger();
    repo = new DualWriteMessageTemplateRepository(primary, secondary, logger);
  });

  describe('読み取り操作', () => {
    it('findByType は primary のみ呼ぶ', async () => {
      const template = createTemplate();
      vi.mocked(primary.findByType).mockResolvedValue(template);

      const result = await repo.findByType(MessageTemplateType.PurchaseThanks);

      expect(result).toBe(template);
      expect(primary.findByType).toHaveBeenCalledWith(MessageTemplateType.PurchaseThanks);
      expect(secondary.findByType).not.toHaveBeenCalled();
    });

    it('findByType が null を返す場合もそのまま返す', async () => {
      vi.mocked(primary.findByType).mockResolvedValue(null);

      const result = await repo.findByType(MessageTemplateType.ShippingNotice);

      expect(result).toBeNull();
    });

    it('findAll は primary のみ呼ぶ', async () => {
      const templates = [createTemplate()];
      vi.mocked(primary.findAll).mockResolvedValue(templates);

      const result = await repo.findAll();

      expect(result).toBe(templates);
      expect(primary.findAll).toHaveBeenCalled();
      expect(secondary.findAll).not.toHaveBeenCalled();
    });
  });

  describe('書き込み操作 - save', () => {
    it('save は primary と secondary の両方に書く', async () => {
      const template = createTemplate();

      await repo.save(template);

      expect(primary.save).toHaveBeenCalledWith(template);
      expect(secondary.save).toHaveBeenCalledWith(template);
    });

    it('save で secondary が失敗してもエラーにならない', async () => {
      vi.mocked(secondary.save).mockRejectedValue(new Error('DB error'));

      await expect(repo.save(createTemplate())).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith('Secondary write failed (MessageTemplate.save)', {
        error: 'DB error',
      });
    });

    it('save で secondary が非Errorオブジェクトで失敗してもログする', async () => {
      vi.mocked(secondary.save).mockRejectedValue('string error');

      await expect(repo.save(createTemplate())).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith('Secondary write failed (MessageTemplate.save)', {
        error: 'string error',
      });
    });

    it('save で primary が失敗したらエラーが伝播し secondary は呼ばれない', async () => {
      vi.mocked(primary.save).mockRejectedValue(new Error('Sheet error'));

      await expect(repo.save(createTemplate())).rejects.toThrow('Sheet error');
      expect(secondary.save).not.toHaveBeenCalled();
    });
  });

  describe('書き込み操作 - saveAll', () => {
    it('saveAll は primary と secondary の両方に書く', async () => {
      const templates = [createTemplate(), createTemplate({ id: 'tmpl-2' })];

      await repo.saveAll(templates);

      expect(primary.saveAll).toHaveBeenCalledWith(templates);
      expect(secondary.saveAll).toHaveBeenCalledWith(templates);
    });

    it('saveAll で secondary が失敗してもエラーにならない', async () => {
      vi.mocked(secondary.saveAll).mockRejectedValue(new Error('DB error'));

      await expect(repo.saveAll([createTemplate()])).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith('Secondary write failed (MessageTemplate.saveAll)', {
        error: 'DB error',
      });
    });

    it('saveAll で primary が失敗したらエラーが伝播し secondary は呼ばれない', async () => {
      vi.mocked(primary.saveAll).mockRejectedValue(new Error('Sheet error'));

      await expect(repo.saveAll([])).rejects.toThrow('Sheet error');
      expect(secondary.saveAll).not.toHaveBeenCalled();
    });
  });

  describe('書き込み操作 - resetToDefault', () => {
    it('resetToDefault は primary を呼び、結果を secondary.save に渡す', async () => {
      const template = createTemplate();
      vi.mocked(primary.resetToDefault).mockResolvedValue(template);

      const result = await repo.resetToDefault(MessageTemplateType.PurchaseThanks);

      expect(result).toBe(template);
      expect(primary.resetToDefault).toHaveBeenCalledWith(MessageTemplateType.PurchaseThanks);
      expect(secondary.save).toHaveBeenCalledWith(template);
    });

    it('resetToDefault で secondary.save が失敗してもエラーにならない', async () => {
      const template = createTemplate();
      vi.mocked(primary.resetToDefault).mockResolvedValue(template);
      vi.mocked(secondary.save).mockRejectedValue(new Error('DB error'));

      const result = await repo.resetToDefault(MessageTemplateType.PurchaseThanks);

      expect(result).toBe(template);
      expect(logger.warn).toHaveBeenCalledWith(
        'Secondary write failed (MessageTemplate.resetToDefault)',
        { error: 'DB error' },
      );
    });

    it('resetToDefault で primary が失敗したらエラーが伝播し secondary は呼ばれない', async () => {
      vi.mocked(primary.resetToDefault).mockRejectedValue(new Error('Sheet error'));

      await expect(repo.resetToDefault(MessageTemplateType.PurchaseThanks)).rejects.toThrow(
        'Sheet error',
      );
      expect(secondary.save).not.toHaveBeenCalled();
    });

    it('resetToDefault は secondary.resetToDefault ではなく secondary.save を呼ぶ', async () => {
      const template = createTemplate();
      vi.mocked(primary.resetToDefault).mockResolvedValue(template);

      await repo.resetToDefault(MessageTemplateType.ShippingNotice);

      expect(secondary.resetToDefault).not.toHaveBeenCalled();
      expect(secondary.save).toHaveBeenCalledWith(template);
    });
  });
});

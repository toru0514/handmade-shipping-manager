import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DualWriteShippingLabelRepository } from '../DualWriteShippingLabelRepository';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import type { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import type { Logger } from '@/infrastructure/logging/Logger';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';

function createMockRepo(): ShippingLabelRepository<ShippingLabel> {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByOrderId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    saveAll: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockLogger(): Logger {
  return {
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('DualWriteShippingLabelRepository', () => {
  let primary: ShippingLabelRepository<ShippingLabel>;
  let secondary: ShippingLabelRepository<ShippingLabel>;
  let logger: Logger;
  let repo: DualWriteShippingLabelRepository;

  beforeEach(() => {
    primary = createMockRepo();
    secondary = createMockRepo();
    logger = createMockLogger();
    repo = new DualWriteShippingLabelRepository(primary, secondary, logger);
  });

  describe('読み取り操作', () => {
    it('findById は primary のみ呼ぶ', async () => {
      const labelId = new LabelId('label-1');
      await repo.findById(labelId);
      expect(primary.findById).toHaveBeenCalledWith(labelId);
      expect(secondary.findById).not.toHaveBeenCalled();
    });

    it('findById は primary の戻り値をそのまま返す', async () => {
      const label = new ShippingLabel({
        labelId: new LabelId('label-1'),
        orderId: new OrderId('ORD-001'),
        type: 'click_post',
      });
      vi.mocked(primary.findById).mockResolvedValue(label);
      const result = await repo.findById(new LabelId('label-1'));
      expect(result).toBe(label);
    });

    it('findByOrderId は primary のみ呼ぶ', async () => {
      const orderId = new OrderId('ORD-001');
      await repo.findByOrderId(orderId);
      expect(primary.findByOrderId).toHaveBeenCalledWith(orderId);
      expect(secondary.findByOrderId).not.toHaveBeenCalled();
    });

    it('findByOrderId は primary の戻り値をそのまま返す', async () => {
      const labels = [
        new ShippingLabel({
          labelId: new LabelId('label-1'),
          orderId: new OrderId('ORD-001'),
          type: 'click_post',
        }),
      ];
      vi.mocked(primary.findByOrderId).mockResolvedValue(labels);
      const result = await repo.findByOrderId(new OrderId('ORD-001'));
      expect(result).toBe(labels);
    });

    it('findAll は primary のみ呼ぶ', async () => {
      await repo.findAll();
      expect(primary.findAll).toHaveBeenCalled();
      expect(secondary.findAll).not.toHaveBeenCalled();
    });

    it('findAll は primary の戻り値をそのまま返す', async () => {
      const labels = [
        new ShippingLabel({
          labelId: new LabelId('label-1'),
          orderId: new OrderId('ORD-001'),
          type: 'yamato_compact',
        }),
      ];
      vi.mocked(primary.findAll).mockResolvedValue(labels);
      const result = await repo.findAll();
      expect(result).toBe(labels);
    });
  });

  describe('書き込み操作', () => {
    it('save は primary と secondary の両方に書く', async () => {
      const label = new ShippingLabel({
        labelId: new LabelId('label-1'),
        orderId: new OrderId('ORD-001'),
        type: 'click_post',
      });
      await repo.save(label);
      expect(primary.save).toHaveBeenCalledWith(label);
      expect(secondary.save).toHaveBeenCalledWith(label);
    });

    it('save は primary を先に呼び、その後 secondary を呼ぶ', async () => {
      const callOrder: string[] = [];
      vi.mocked(primary.save).mockImplementation(async () => {
        callOrder.push('primary');
      });
      vi.mocked(secondary.save).mockImplementation(async () => {
        callOrder.push('secondary');
      });

      const label = new ShippingLabel({
        labelId: new LabelId('label-1'),
        orderId: new OrderId('ORD-001'),
        type: 'click_post',
      });
      await repo.save(label);
      expect(callOrder).toEqual(['primary', 'secondary']);
    });

    it('save で secondary が失敗してもエラーにならない', async () => {
      vi.mocked(secondary.save).mockRejectedValue(new Error('DB error'));
      const label = new ShippingLabel({
        labelId: new LabelId('label-1'),
        orderId: new OrderId('ORD-001'),
        type: 'click_post',
      });
      await expect(repo.save(label)).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('save で secondary が失敗したらエラーメッセージをログに記録する', async () => {
      vi.mocked(secondary.save).mockRejectedValue(new Error('DB connection lost'));
      const label = new ShippingLabel({
        labelId: new LabelId('label-1'),
        orderId: new OrderId('ORD-001'),
        type: 'click_post',
      });
      await repo.save(label);
      expect(logger.warn).toHaveBeenCalledWith('Secondary write failed (ShippingLabel.save)', {
        error: 'DB connection lost',
      });
    });

    it('save で secondary が非 Error オブジェクトで失敗した場合も適切にログ出力する', async () => {
      vi.mocked(secondary.save).mockRejectedValue('string error');
      const label = new ShippingLabel({
        labelId: new LabelId('label-1'),
        orderId: new OrderId('ORD-001'),
        type: 'click_post',
      });
      await repo.save(label);
      expect(logger.warn).toHaveBeenCalledWith('Secondary write failed (ShippingLabel.save)', {
        error: 'string error',
      });
    });

    it('save で primary が失敗したらエラーが伝播する', async () => {
      vi.mocked(primary.save).mockRejectedValue(new Error('Sheet error'));
      const label = new ShippingLabel({
        labelId: new LabelId('label-1'),
        orderId: new OrderId('ORD-001'),
        type: 'click_post',
      });
      await expect(repo.save(label)).rejects.toThrow('Sheet error');
      expect(secondary.save).not.toHaveBeenCalled();
    });

    it('saveAll は primary と secondary の両方に書く', async () => {
      const labels = [
        new ShippingLabel({
          labelId: new LabelId('label-1'),
          orderId: new OrderId('ORD-001'),
          type: 'click_post',
        }),
      ];
      await repo.saveAll(labels);
      expect(primary.saveAll).toHaveBeenCalledWith(labels);
      expect(secondary.saveAll).toHaveBeenCalledWith(labels);
    });

    it('saveAll は primary を先に呼び、その後 secondary を呼ぶ', async () => {
      const callOrder: string[] = [];
      vi.mocked(primary.saveAll).mockImplementation(async () => {
        callOrder.push('primary');
      });
      vi.mocked(secondary.saveAll).mockImplementation(async () => {
        callOrder.push('secondary');
      });

      await repo.saveAll([]);
      expect(callOrder).toEqual(['primary', 'secondary']);
    });

    it('saveAll で secondary が失敗してもエラーにならない', async () => {
      vi.mocked(secondary.saveAll).mockRejectedValue(new Error('DB error'));
      await expect(repo.saveAll([])).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('saveAll で secondary が失敗したらエラーメッセージをログに記録する', async () => {
      vi.mocked(secondary.saveAll).mockRejectedValue(new Error('DB batch error'));
      await repo.saveAll([]);
      expect(logger.warn).toHaveBeenCalledWith('Secondary write failed (ShippingLabel.saveAll)', {
        error: 'DB batch error',
      });
    });

    it('saveAll で primary が失敗したらエラーが伝播する', async () => {
      vi.mocked(primary.saveAll).mockRejectedValue(new Error('Sheet error'));
      await expect(repo.saveAll([])).rejects.toThrow('Sheet error');
      expect(secondary.saveAll).not.toHaveBeenCalled();
    });
  });
});

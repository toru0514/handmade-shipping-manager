import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DualWriteOrderRepository } from '../DualWriteOrderRepository';
import type { OrderRepository } from '@/domain/ports/OrderRepository';
import type { Order } from '@/domain/entities/Order';
import type { Logger } from '@/infrastructure/logging/Logger';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';

function createMockRepository(): OrderRepository<Order> {
  return {
    findById: vi.fn(),
    findByStatus: vi.fn(),
    findByBuyerName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn(),
    exists: vi.fn(),
  };
}

function createMockLogger(): Logger {
  return { warn: vi.fn(), error: vi.fn() };
}

describe('DualWriteOrderRepository', () => {
  let primary: OrderRepository<Order>;
  let secondary: OrderRepository<Order>;
  let logger: Logger;
  let repo: DualWriteOrderRepository;

  beforeEach(() => {
    primary = createMockRepository();
    secondary = createMockRepository();
    logger = createMockLogger();
    repo = new DualWriteOrderRepository(primary, secondary, logger);
  });

  describe('読み取り操作', () => {
    it('findById は primary のみ呼ぶ', async () => {
      const orderId = new OrderId('M-test-001');
      await repo.findById(orderId);
      expect(primary.findById).toHaveBeenCalled();
      expect(secondary.findById).not.toHaveBeenCalled();
    });

    it('findByStatus は primary のみ呼ぶ', async () => {
      const status = new OrderStatus('pending');
      await repo.findByStatus(status);
      expect(primary.findByStatus).toHaveBeenCalled();
      expect(secondary.findByStatus).not.toHaveBeenCalled();
    });

    it('findByBuyerName は primary のみ呼ぶ', async () => {
      await repo.findByBuyerName('test');
      expect(primary.findByBuyerName).toHaveBeenCalled();
      expect(secondary.findByBuyerName).not.toHaveBeenCalled();
    });

    it('findAll は primary のみ呼ぶ', async () => {
      await repo.findAll();
      expect(primary.findAll).toHaveBeenCalled();
      expect(secondary.findAll).not.toHaveBeenCalled();
    });

    it('exists は primary のみ呼ぶ', async () => {
      const orderId = new OrderId('M-test-001');
      await repo.exists(orderId);
      expect(primary.exists).toHaveBeenCalled();
      expect(secondary.exists).not.toHaveBeenCalled();
    });
  });

  describe('書き込み操作', () => {
    it('save は primary と secondary の両方に書く', async () => {
      const order = {} as Order;
      await repo.save(order);
      expect(primary.save).toHaveBeenCalledWith(order);
      expect(secondary.save).toHaveBeenCalledWith(order);
    });

    it('save で secondary が失敗してもエラーにならない', async () => {
      vi.mocked(secondary.save).mockRejectedValue(new Error('DB error'));
      await expect(repo.save({} as Order)).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('save で primary が失敗したらエラーが伝播する', async () => {
      vi.mocked(primary.save).mockRejectedValue(new Error('Sheet error'));
      await expect(repo.save({} as Order)).rejects.toThrow('Sheet error');
      expect(secondary.save).not.toHaveBeenCalled();
    });

    it('saveAll は primary と secondary の両方に書く', async () => {
      const orders = [{} as Order];
      await repo.saveAll(orders);
      expect(primary.saveAll).toHaveBeenCalledWith(orders);
      expect(secondary.saveAll).toHaveBeenCalledWith(orders);
    });

    it('saveAll で secondary が失敗してもエラーにならない', async () => {
      vi.mocked(secondary.saveAll).mockRejectedValue(new Error('DB error'));
      await expect(repo.saveAll([])).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});

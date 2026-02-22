import { describe, expect, it, vi } from 'vitest';
import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { NotificationSender } from '@/domain/ports/NotificationSender';
import { OrderFetcher, PlatformOrderData } from '@/domain/ports/OrderFetcher';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { Message } from '@/domain/valueObjects/Message';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { FetchOrderUseCase } from '../FetchOrderUseCase';

class InMemoryOrderRepository implements OrderRepository<Order> {
  private readonly store = new Map<string, Order>();

  async findById(orderId: OrderId): Promise<Order | null> {
    return this.store.get(orderId.toString()) ?? null;
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return [...this.store.values()].filter((order) => order.status.equals(status));
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    return [...this.store.values()].filter((order) => order.buyer.name.toString().includes(name));
  }

  async save(order: Order): Promise<void> {
    this.store.set(order.orderId.toString(), order);
  }

  async exists(orderId: OrderId): Promise<boolean> {
    return this.store.has(orderId.toString());
  }

  async findAll(): Promise<Order[]> {
    return [...this.store.values()];
  }
}

function createPlatformOrderData(overrides: Partial<PlatformOrderData> = {}): PlatformOrderData {
  return {
    orderId: 'MN-0001',
    platform: Platform.Minne,
    buyerName: '山田 太郎',
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    buyerPhone: '09012345678',
    productName: 'ハンドメイドアクセサリー',
    orderedAt: new Date('2026-02-22T00:00:00.000Z'),
    ...overrides,
  };
}

describe('FetchOrderUseCase', () => {
  it('注文取得に成功した場合、Order を保存して registered を返す', async () => {
    const repository = new InMemoryOrderRepository();
    const fetcher: OrderFetcher = {
      fetch: vi.fn(async () => createPlatformOrderData()),
    };
    const notificationSender: NotificationSender = {
      notify: vi.fn(async () => undefined),
    };
    const useCase = new FetchOrderUseCase(repository, fetcher, notificationSender);

    const result = await useCase.execute({
      orderId: 'MN-0001',
      platform: 'minne',
    });

    expect(result).toEqual({
      orderId: 'MN-0001',
      platform: 'minne',
      status: 'registered',
    });
    expect(fetcher.fetch).toHaveBeenCalledWith(new OrderId('MN-0001'), Platform.Minne);
    const saved = await repository.findById(new OrderId('MN-0001'));
    expect(saved).not.toBeNull();
    expect(notificationSender.notify).not.toHaveBeenCalled();
  });

  it('重複注文の場合は取得・保存せず skipped_duplicate を返す', async () => {
    const repository = new InMemoryOrderRepository();
    await repository.save(new OrderFactory().createFromPlatformData(createPlatformOrderData()));

    const fetcher: OrderFetcher = {
      fetch: vi.fn(async () => createPlatformOrderData()),
    };
    const notificationSender: NotificationSender = {
      notify: vi.fn(async () => undefined),
    };
    const useCase = new FetchOrderUseCase(repository, fetcher, notificationSender);

    const result = await useCase.execute({
      orderId: 'MN-0001',
      platform: 'minne',
    });

    expect(result.status).toBe('skipped_duplicate');
    expect(fetcher.fetch).not.toHaveBeenCalled();
    expect(notificationSender.notify).not.toHaveBeenCalled();
  });

  it('保存時に重複競合が起きた場合は skipped_duplicate を返す', async () => {
    const duplicateError = new Error('duplicate key');
    const repository: OrderRepository<Order> = {
      findById: vi.fn(async () => null),
      findByStatus: vi.fn(async () => []),
      findByBuyerName: vi.fn(async () => []),
      save: vi.fn(async () => {
        throw duplicateError;
      }),
      exists: vi
        .fn<() => Promise<boolean>>()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
      findAll: vi.fn(async () => []),
    };
    const fetcher: OrderFetcher = {
      fetch: vi.fn(async () => createPlatformOrderData()),
    };
    const notificationSender: NotificationSender = {
      notify: vi.fn(async () => undefined),
    };
    const useCase = new FetchOrderUseCase(repository, fetcher, notificationSender);

    const result = await useCase.execute({
      orderId: 'MN-0001',
      platform: 'minne',
    });

    expect(result).toEqual({
      orderId: 'MN-0001',
      platform: 'minne',
      status: 'skipped_duplicate',
    });
    expect(notificationSender.notify).not.toHaveBeenCalled();
  });

  it('取得失敗時は通知を送信してエラーを投げる（保存しない）', async () => {
    const repository = new InMemoryOrderRepository();
    const fetcher: OrderFetcher = {
      fetch: vi.fn(async () => {
        throw new Error('platform timeout');
      }),
    };
    const notificationSender: NotificationSender = {
      notify: vi.fn(async () => undefined),
    };
    const useCase = new FetchOrderUseCase(repository, fetcher, notificationSender);

    await expect(
      useCase.execute({
        orderId: 'CR-0002',
        platform: 'creema',
      }),
    ).rejects.toThrow('注文取得に失敗しました');

    expect(notificationSender.notify).toHaveBeenCalledTimes(1);
    const message = (notificationSender.notify as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(message).toBeInstanceOf(Message);
    expect((message as Message).toString()).toContain('orderId: CR-0002');
    expect(await repository.findById(new OrderId('CR-0002'))).toBeNull();
  });

  it('通知送信に失敗しても元の取得エラーを優先する', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const repository = new InMemoryOrderRepository();
    const fetcher: OrderFetcher = {
      fetch: vi.fn(async () => {
        throw new Error('fetch failed');
      }),
    };
    const notificationSender: NotificationSender = {
      notify: vi.fn(async () => {
        throw new Error('notify failed');
      }),
    };
    const useCase = new FetchOrderUseCase(repository, fetcher, notificationSender);

    await expect(
      useCase.execute({
        orderId: 'MN-0003',
        platform: 'minne',
      }),
    ).rejects.toThrow('fetch failed');

    expect(warnSpy).toHaveBeenCalledWith(
      '[FetchOrderUseCase] エラー通知の送信に失敗しました',
      expect.any(Error),
    );
  });
});

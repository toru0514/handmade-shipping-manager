import { describe, expect, it, vi } from 'vitest';
import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { EmailOrderSource, UnreadOrderRef } from '@/domain/ports/EmailOrderSource';
import { OrderFetcher, PlatformOrderData } from '@/domain/ports/OrderFetcher';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { FetchNewOrdersUseCase } from '../FetchNewOrdersUseCase';

// ---------------------------------------------------------------------------
// テスト用インメモリリポジトリ
// ---------------------------------------------------------------------------

class InMemoryOrderRepository implements OrderRepository<Order> {
  private readonly store = new Map<string, Order>();

  async findById(orderId: OrderId): Promise<Order | null> {
    return this.store.get(orderId.toString()) ?? null;
  }
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return [...this.store.values()].filter((o) => o.status.equals(status));
  }
  async findByBuyerName(name: string): Promise<Order[]> {
    return [...this.store.values()].filter((o) => o.buyer.name.toString().includes(name));
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

// ---------------------------------------------------------------------------
// テスト用ファクトリ
// ---------------------------------------------------------------------------

function makeRef(orderId: string, messageId = `msg-${orderId}`): UnreadOrderRef {
  return { messageId, orderId };
}

function makePlatformData(orderId: string): PlatformOrderData {
  return {
    orderId,
    platform: Platform.Minne,
    buyerName: '山田 太郎',
    buyerPostalCode: '1500001',
    buyerPrefecture: '東京都',
    buyerCity: '渋谷区',
    buyerAddress1: '神宮前1-1-1',
    productName: 'ハンドメイドアクセサリー',
    orderedAt: new Date('2026-02-22'),
  };
}

function makeEmailSource(refs: UnreadOrderRef[]): EmailOrderSource {
  return {
    fetchUnreadOrderRefs: vi.fn(async () => refs),
    markAsRead: vi.fn(async () => undefined),
  };
}

function makeFetcher(data: PlatformOrderData): OrderFetcher {
  return {
    fetch: vi.fn(async () => data),
  };
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('FetchNewOrdersUseCase', () => {
  it('新規注文を取得・保存し fetched カウントを返す', async () => {
    const refs = [makeRef('MN-001'), makeRef('MN-002')];
    const emailSource = makeEmailSource(refs);
    const fetcher: OrderFetcher = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(makePlatformData('MN-001'))
        .mockResolvedValueOnce(makePlatformData('MN-002')),
    };
    const repository = new InMemoryOrderRepository();

    const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
    const result = await useCase.execute({ platform: 'minne' });

    expect(result).toEqual({ fetched: 2, skipped: 0, errors: [] });
    expect(await repository.exists(new OrderId('MN-001'))).toBe(true);
    expect(await repository.exists(new OrderId('MN-002'))).toBe(true);
    expect(emailSource.markAsRead).toHaveBeenCalledWith('msg-MN-001');
    expect(emailSource.markAsRead).toHaveBeenCalledWith('msg-MN-002');
  });

  it('重複注文はスキップしてメールを既読化する', async () => {
    const repository = new InMemoryOrderRepository();
    await repository.save(new OrderFactory().createFromPlatformData(makePlatformData('MN-001')));

    const refs = [makeRef('MN-001'), makeRef('MN-002')];
    const emailSource = makeEmailSource(refs);
    const fetcher: OrderFetcher = {
      fetch: vi.fn().mockResolvedValueOnce(makePlatformData('MN-002')),
    };

    const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
    const result = await useCase.execute({ platform: 'minne' });

    expect(result).toEqual({ fetched: 1, skipped: 1, errors: [] });
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    // 重複分も既読化される
    expect(emailSource.markAsRead).toHaveBeenCalledWith('msg-MN-001');
    expect(emailSource.markAsRead).toHaveBeenCalledWith('msg-MN-002');
  });

  it('取得エラー時は errors に記録し、メールは既読化しない', async () => {
    const refs = [makeRef('MN-001'), makeRef('MN-002')];
    const emailSource = makeEmailSource(refs);
    const fetcher: OrderFetcher = {
      fetch: vi
        .fn()
        .mockRejectedValueOnce(new Error('scrape failed'))
        .mockResolvedValueOnce(makePlatformData('MN-002')),
    };
    const repository = new InMemoryOrderRepository();

    const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
    const result = await useCase.execute({ platform: 'minne' });

    expect(result.fetched).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([{ orderId: 'MN-001', reason: 'scrape failed' }]);
    // エラーの MN-001 は既読化しない（次回リトライ可能にする）
    expect(emailSource.markAsRead).not.toHaveBeenCalledWith('msg-MN-001');
    expect(emailSource.markAsRead).toHaveBeenCalledWith('msg-MN-002');
  });

  it('1件エラーが発生しても他の注文の処理を継続する', async () => {
    const refs = [makeRef('MN-001'), makeRef('MN-002'), makeRef('MN-003')];
    const emailSource = makeEmailSource(refs);
    const fetcher: OrderFetcher = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce(makePlatformData('MN-001'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(makePlatformData('MN-003')),
    };
    const repository = new InMemoryOrderRepository();

    const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
    const result = await useCase.execute({ platform: 'minne' });

    expect(result).toEqual({
      fetched: 2,
      skipped: 0,
      errors: [{ orderId: 'MN-002', reason: 'timeout' }],
    });
  });

  it('save 時の競合を重複スキップとして扱い既読化する', async () => {
    const refs = [makeRef('MN-001')];
    const emailSource = makeEmailSource(refs);
    const fetcher = makeFetcher(makePlatformData('MN-001'));

    // exists(): 1回目 false（重複チェック通過）→ save 失敗 → 2回目 true（競合確認）
    const repository: OrderRepository<Order> = {
      findById: vi.fn(async () => null),
      findByStatus: vi.fn(async () => []),
      findByBuyerName: vi.fn(async () => []),
      save: vi.fn(async () => {
        throw new Error('duplicate key');
      }),
      exists: vi
        .fn<() => Promise<boolean>>()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
      findAll: vi.fn(async () => []),
    };

    const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
    const result = await useCase.execute({ platform: 'minne' });

    expect(result).toEqual({ fetched: 0, skipped: 1, errors: [] });
    expect(emailSource.markAsRead).toHaveBeenCalledWith('msg-MN-001');
  });

  it('メールが存在しない場合は空の結果を返す', async () => {
    const emailSource = makeEmailSource([]);
    const fetcher: OrderFetcher = { fetch: vi.fn() };
    const repository = new InMemoryOrderRepository();

    const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
    const result = await useCase.execute({ platform: 'minne' });

    expect(result).toEqual({ fetched: 0, skipped: 0, errors: [] });
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });

  it('markAsRead 失敗時は警告ログを出すが全体の結果には影響しない', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const refs = [makeRef('MN-001')];
      const emailSource: EmailOrderSource = {
        fetchUnreadOrderRefs: vi.fn(async () => refs),
        markAsRead: vi.fn(async () => {
          throw new Error('network error');
        }),
      };
      const fetcher = makeFetcher(makePlatformData('MN-001'));
      const repository = new InMemoryOrderRepository();

      const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
      const result = await useCase.execute({ platform: 'minne' });

      expect(result).toEqual({ fetched: 1, skipped: 0, errors: [] });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FetchNewOrdersUseCase] markAsRead 失敗'),
        expect.any(Error),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('orderId が空文字のメールはエラーに記録し他の処理を継続する', async () => {
    const refs = [makeRef('', 'msg-bad'), makeRef('MN-002')];
    const emailSource = makeEmailSource(refs);
    const fetcher: OrderFetcher = {
      fetch: vi.fn().mockResolvedValueOnce(makePlatformData('MN-002')),
    };
    const repository = new InMemoryOrderRepository();

    const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
    const result = await useCase.execute({ platform: 'minne' });

    expect(result.fetched).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].orderId).toBe('');
    // 不正な orderId のメールは既読化しない
    expect(emailSource.markAsRead).not.toHaveBeenCalledWith('msg-bad');
  });

  describe('サマリー通知', () => {
    it('新規登録があれば notificationSender.notify を呼ぶ', async () => {
      const notifySpy = vi.fn().mockResolvedValue(undefined);
      const useCase = new FetchNewOrdersUseCase(
        makeEmailSource([makeRef('MN-001')]),
        makeFetcher(makePlatformData('MN-001')),
        new InMemoryOrderRepository(),
        new OrderFactory(),
        { notify: notifySpy },
      );

      await useCase.execute({ platform: 'minne' });

      expect(notifySpy).toHaveBeenCalledOnce();
      expect(notifySpy.mock.calls[0][0].content).toContain('新規登録: 1件');
      expect(notifySpy.mock.calls[0][0].content).toContain(
        'https://handmade-shipping-manager.vercel.app/orders',
      );
    });

    it('fetched=0 かつ errors=[] の場合は通知しない（スキップのみ）', async () => {
      const notifySpy = vi.fn();
      const repo = new InMemoryOrderRepository();
      await repo.save(new OrderFactory().createFromPlatformData(makePlatformData('MN-001')));

      const useCase = new FetchNewOrdersUseCase(
        makeEmailSource([makeRef('MN-001')]),
        makeFetcher(makePlatformData('MN-001')),
        repo,
        new OrderFactory(),
        { notify: notifySpy },
      );

      await useCase.execute({ platform: 'minne' });

      expect(notifySpy).not.toHaveBeenCalled();
    });

    it('通知失敗でも useCase の result には影響しない', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const useCase = new FetchNewOrdersUseCase(
          makeEmailSource([makeRef('MN-001')]),
          makeFetcher(makePlatformData('MN-001')),
          new InMemoryOrderRepository(),
          new OrderFactory(),
          { notify: vi.fn().mockRejectedValue(new Error('Slack down')) },
        );

        const result = await useCase.execute({ platform: 'minne' });

        expect(result.fetched).toBe(1);
        expect(result.errors).toHaveLength(0);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  it('withinDays オプションを EmailOrderSource に渡す', async () => {
    const emailSource = makeEmailSource([]);
    const fetcher: OrderFetcher = { fetch: vi.fn() };
    const repository = new InMemoryOrderRepository();

    const useCase = new FetchNewOrdersUseCase(emailSource, fetcher, repository);
    await useCase.execute({ platform: 'minne', withinDays: 7 });

    expect(emailSource.fetchUnreadOrderRefs).toHaveBeenCalledWith({ withinDays: 7 });
  });
});

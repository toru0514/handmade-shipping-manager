import { describe, expect, it, vi } from 'vitest';
import { FetchOrderInput, FetchOrderResultDto } from '@/application/usecases/FetchOrderUseCase';
import { GmailClient, PurchaseNotification } from '@/infrastructure/external/google/GmailClient';
import { FetchOrderExecutor, GmailPoller } from '../GmailPoller';

class StubFetchOrderExecutor implements FetchOrderExecutor {
  constructor(private readonly handler: (input: FetchOrderInput) => Promise<FetchOrderResultDto>) {}

  async execute(input: FetchOrderInput): Promise<FetchOrderResultDto> {
    return this.handler(input);
  }
}

class StubGmailClient extends GmailClient {
  constructor(private readonly notifications: PurchaseNotification[]) {
    super({
      accessToken: 'stub-token',
      baseUrl: 'https://example.invalid',
    });
  }

  async listUnreadPurchaseNotifications(): Promise<PurchaseNotification[]> {
    return this.notifications;
  }
}

describe('GmailPoller', () => {
  it('メール通知を処理して登録/重複スキップを集計できる', async () => {
    const notifications: PurchaseNotification[] = [
      {
        messageId: 'm1',
        platform: 'minne',
        orderId: 'MN-1',
        subject: 'minne 注文',
      },
      {
        messageId: 'm2',
        platform: 'creema',
        orderId: 'CR-1',
        subject: 'creema 注文',
      },
    ];

    const execute = vi.fn(async (input: FetchOrderInput): Promise<FetchOrderResultDto> => {
      if (input.orderId === 'MN-1') {
        return { orderId: input.orderId, platform: input.platform, status: 'registered' };
      }
      return { orderId: input.orderId, platform: input.platform, status: 'skipped_duplicate' };
    });

    const poller = new GmailPoller(
      new StubGmailClient(notifications),
      new StubFetchOrderExecutor(execute),
    );
    const result = await poller.runOnce();

    expect(result).toEqual({
      processed: 2,
      registered: 1,
      skipped: 1,
      failed: 0,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('個別処理失敗があっても他通知の処理を継続する', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const notifications: PurchaseNotification[] = [
      {
        messageId: 'm1',
        platform: 'minne',
        orderId: 'MN-2',
        subject: 'minne 注文',
      },
      {
        messageId: 'm2',
        platform: 'creema',
        orderId: 'CR-2',
        subject: 'creema 注文',
      },
    ];

    const execute = vi.fn(async (input: FetchOrderInput): Promise<FetchOrderResultDto> => {
      if (input.orderId === 'MN-2') {
        throw new Error('fetch failed');
      }
      return { orderId: input.orderId, platform: input.platform, status: 'registered' };
    });

    const poller = new GmailPoller(
      new StubGmailClient(notifications),
      new StubFetchOrderExecutor(execute),
    );
    const result = await poller.runOnce();

    expect(result).toEqual({
      processed: 2,
      registered: 1,
      skipped: 0,
      failed: 1,
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      '[GmailPoller] 注文処理に失敗しました',
      expect.objectContaining({ messageId: 'm1', orderId: 'MN-2' }),
    );
  });
});

import { FetchOrderInput, FetchOrderResultDto } from '@/application/usecases/FetchOrderUseCase';
import { GmailClient, PurchaseNotification } from '@/infrastructure/external/google/GmailClient';

export interface FetchOrderExecutor {
  execute(input: FetchOrderInput): Promise<FetchOrderResultDto>;
}

export interface GmailPollResult {
  readonly processed: number;
  readonly registered: number;
  readonly skipped: number;
  readonly failed: number;
}

export class GmailPoller {
  constructor(
    private readonly gmailClient: GmailClient,
    private readonly fetchOrderExecutor: FetchOrderExecutor,
  ) {}

  async runOnce(): Promise<GmailPollResult> {
    const notifications = await this.gmailClient.listUnreadPurchaseNotifications();
    return this.processNotifications(notifications);
  }

  private async processNotifications(
    notifications: PurchaseNotification[],
  ): Promise<GmailPollResult> {
    let registered = 0;
    let skipped = 0;
    let failed = 0;

    // Gmail/各プラットフォーム側のレート制限を考慮して逐次処理にしている。
    for (const notification of notifications) {
      try {
        const result = await this.fetchOrderExecutor.execute({
          orderId: notification.orderId,
          platform: notification.platform,
        });

        if (result.status === 'registered') {
          registered += 1;
        } else if (result.status === 'skipped_duplicate') {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        console.error('[GmailPoller] 注文処理に失敗しました', {
          messageId: notification.messageId,
          platform: notification.platform,
          orderId: notification.orderId,
          error,
        });
      }
    }

    return {
      processed: notifications.length,
      registered,
      skipped,
      failed,
    };
  }
}

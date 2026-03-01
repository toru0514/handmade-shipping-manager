import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { EmailOrderSource } from '@/domain/ports/EmailOrderSource';
import { NotificationSender } from '@/domain/ports/NotificationSender';
import { OrderFetcher } from '@/domain/ports/OrderFetcher';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Message } from '@/domain/valueObjects/Message';
import { Platform } from '@/domain/valueObjects/Platform';

export interface FetchNewOrdersInput {
  readonly platform: string;
  /** EmailOrderSource に渡す日数フィルタ（省略時はデフォルト 30 日） */
  readonly withinDays?: number;
}

export interface FetchNewOrdersErrorInfo {
  readonly orderId: string;
  readonly reason: string;
}

export interface FetchNewOrdersResult {
  readonly fetched: number;
  readonly skipped: number;
  readonly errors: FetchNewOrdersErrorInfo[];
}

export class FetchNewOrdersUseCase {
  private static readonly ORDERS_PAGE_URL = 'https://handmade-shipping-manager.vercel.app/orders';

  constructor(
    private readonly emailOrderSource: EmailOrderSource,
    private readonly orderFetcher: OrderFetcher,
    private readonly orderRepository: OrderRepository<Order>,
    private readonly orderFactory: OrderFactory = new OrderFactory(),
    private readonly notificationSender?: NotificationSender,
  ) {}

  async execute(input: FetchNewOrdersInput): Promise<FetchNewOrdersResult> {
    const platform = new Platform(input.platform);
    const refs = await this.emailOrderSource.fetchUnreadOrderRefs({
      withinDays: input.withinDays,
    });

    let fetched = 0;
    let skipped = 0;
    const errors: FetchNewOrdersErrorInfo[] = [];

    for (const ref of refs) {
      try {
        const orderId = new OrderId(ref.orderId);

        // 重複チェック（DR-ORD-001）
        if (await this.orderRepository.exists(orderId)) {
          skipped++;
          await this.markAsReadSilently(ref.messageId);
          continue;
        }

        const platformData = await this.orderFetcher.fetch(orderId, platform);
        const order = this.orderFactory.createFromPlatformData(platformData);

        try {
          await this.orderRepository.save(order);
        } catch (saveError) {
          // exists() → save() の間に別プロセスが同一注文を登録した場合は重複扱い
          if (await this.orderRepository.exists(orderId)) {
            skipped++;
            await this.markAsReadSilently(ref.messageId);
            continue;
          }
          throw saveError;
        }

        await this.markAsReadSilently(ref.messageId);
        fetched++;
      } catch (error) {
        // 1件のエラーが他の注文の処理を止めない。既読化はしない（次回リトライ可能にする）
        const reason = error instanceof Error ? error.message : String(error);
        errors.push({ orderId: ref.orderId, reason });
      }
    }

    await this.sendSummaryNotification(platform.value, fetched, skipped, errors);

    return { fetched, skipped, errors };
  }

  private async sendSummaryNotification(
    platform: string,
    fetched: number,
    skipped: number,
    errors: FetchNewOrdersErrorInfo[],
  ): Promise<void> {
    if (!this.notificationSender) return;
    if (fetched === 0 && errors.length === 0) return;

    const lines: string[] = [`[${platform}] 注文取得が完了しました`];
    if (fetched > 0) lines.push(`✅ 新規登録: ${fetched}件`);
    if (skipped > 0) lines.push(`⏭ スキップ: ${skipped}件`);
    if (errors.length > 0) {
      lines.push(`⚠️ エラー: ${errors.length}件`);
      for (const e of errors) {
        lines.push(`  • ${e.orderId}: ${e.reason}`);
      }
    }
    lines.push(`📋 注文一覧: ${FetchNewOrdersUseCase.ORDERS_PAGE_URL}`);

    await this.notificationSender.notify(new Message(lines.join('\n'))).catch((e) => {
      console.warn('[FetchNewOrdersUseCase] Slack 通知失敗:', e);
    });
  }

  private async markAsReadSilently(messageId: string): Promise<void> {
    await this.emailOrderSource.markAsRead(messageId).catch((e) => {
      console.warn(`[FetchNewOrdersUseCase] markAsRead 失敗 (messageId=${messageId})`, e);
    });
  }
}

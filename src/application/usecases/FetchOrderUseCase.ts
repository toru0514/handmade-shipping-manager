import { Order } from '@/domain/entities/Order';
import { OrderFactory } from '@/domain/factories/OrderFactory';
import { NotificationSender } from '@/domain/ports/NotificationSender';
import { OrderFetcher } from '@/domain/ports/OrderFetcher';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { Message } from '@/domain/valueObjects/Message';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { Platform } from '@/domain/valueObjects/Platform';

export interface FetchOrderInput {
  readonly orderId: string;
  readonly platform: string;
}

export interface FetchOrderResultDto {
  readonly orderId: string;
  readonly platform: string;
  readonly status: 'registered' | 'skipped_duplicate';
}

export class FetchOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository<Order>,
    private readonly orderFetcher: OrderFetcher,
    private readonly notificationSender: NotificationSender,
    private readonly orderFactory: OrderFactory = new OrderFactory(),
  ) {}

  async execute(input: FetchOrderInput): Promise<FetchOrderResultDto> {
    const orderId = new OrderId(input.orderId);
    const platform = new Platform(input.platform);

    if (await this.orderRepository.exists(orderId)) {
      return {
        orderId: orderId.toString(),
        platform: platform.toString(),
        status: 'skipped_duplicate',
      };
    }

    try {
      const platformOrder = await this.orderFetcher.fetch(orderId, platform);
      const order = this.orderFactory.createFromPlatformData(platformOrder);
      await this.orderRepository.save(order);
      return {
        orderId: orderId.toString(),
        platform: platform.toString(),
        status: 'registered',
      };
    } catch (error) {
      await this.notifyFailure(orderId, platform, error);
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `注文取得に失敗しました: orderId=${orderId.toString()} platform=${platform.toString()} reason=${reason}`,
        { cause: error },
      );
    }
  }

  private async notifyFailure(orderId: OrderId, platform: Platform, error: unknown): Promise<void> {
    const reason = error instanceof Error ? error.message : String(error);
    const message = new Message(
      [
        '注文取得に失敗しました',
        `orderId: ${orderId.toString()}`,
        `platform: ${platform.toString()}`,
        `reason: ${reason}`,
      ].join('\n'),
    );

    await this.notificationSender.notify(message).catch((notifyError) => {
      console.warn('[FetchOrderUseCase] エラー通知の送信に失敗しました', notifyError);
    });
  }
}

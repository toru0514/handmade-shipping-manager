import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

export interface MarkOrderAsShippedInput {
  readonly orderId: string;
  readonly shippingMethod: string;
  readonly trackingNumber?: string;
}

export interface MarkOrderAsShippedResultDto {
  readonly orderId: string;
  readonly status: string;
  readonly shippedAt: string;
  readonly shippingMethod: string;
  readonly trackingNumber?: string;
}

export class MarkOrderAsShippedUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(input: MarkOrderAsShippedInput): Promise<MarkOrderAsShippedResultDto> {
    const order = await this.orderRepository.findById(new OrderId(input.orderId));
    if (order === null) {
      throw new Error(`対象注文が見つかりません: ${input.orderId}`);
    }

    const method = new ShippingMethod(input.shippingMethod);
    const normalizedTrackingNumber = input.trackingNumber?.trim();
    const trackingNumber =
      normalizedTrackingNumber && normalizedTrackingNumber.length > 0
        ? new TrackingNumber(normalizedTrackingNumber)
        : undefined;

    order.markAsShipped(method, trackingNumber);
    await this.orderRepository.save(order);

    if (order.shippedAt === undefined) {
      throw new Error('発送日時の記録に失敗しました');
    }

    return {
      orderId: order.orderId.toString(),
      status: order.status.toString(),
      shippedAt: order.shippedAt.toISOString(),
      shippingMethod: order.shippingMethod?.toString() ?? method.toString(),
      trackingNumber: order.trackingNumber?.toString(),
    };
  }
}

import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';
import {
  InvalidShipmentInputError,
  InvalidShipmentOperationError,
  OrderNotFoundError,
} from './MarkOrderAsShippedErrors';

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
      throw new OrderNotFoundError(input.orderId);
    }

    if (!order.status.isPending()) {
      throw new InvalidShipmentOperationError('発送済みの注文は変更できません');
    }

    let method: ShippingMethod;
    try {
      method = new ShippingMethod(input.shippingMethod);
    } catch (err) {
      const message = err instanceof Error ? err.message : '配送方法が不正です';
      throw new InvalidShipmentInputError(message);
    }

    const normalizedTrackingNumber = input.trackingNumber?.trim();
    let trackingNumber: TrackingNumber | undefined;

    if (normalizedTrackingNumber && normalizedTrackingNumber.length > 0) {
      try {
        trackingNumber = new TrackingNumber(normalizedTrackingNumber);
      } catch (err) {
        const message = err instanceof Error ? err.message : '追跡番号が不正です';
        throw new InvalidShipmentInputError(message);
      }
    }

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

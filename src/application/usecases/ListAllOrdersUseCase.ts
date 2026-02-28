import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';

export interface OrderSummaryDto {
  readonly orderId: string;
  readonly platform: string;
  readonly buyerName: string;
  readonly prefecture: string;
  readonly productName: string;
  readonly status: string;
  readonly orderedAt: string;
  readonly shippedAt: string | null;
}

export class ListAllOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository<Order>) {}

  async execute(): Promise<OrderSummaryDto[]> {
    const orders = await this.orderRepository.findAll();

    return orders
      .map((order) => this.toDto(order))
      .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
  }

  private toDto(order: Order): OrderSummaryDto {
    return {
      orderId: order.orderId.toString(),
      platform: order.platform.toString(),
      buyerName: order.buyer.name.toString(),
      prefecture: order.buyer.address.prefecture.toString(),
      productName: order.product.name,
      status: order.status.toString(),
      orderedAt: order.orderedAt.toISOString(),
      shippedAt: order.shippedAt?.toISOString() ?? null,
    };
  }
}

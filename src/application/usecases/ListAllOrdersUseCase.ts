import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';

export interface OrderSummaryDto {
  readonly orderId: string;
  readonly platform: string;
  readonly buyerName: string;
  readonly postalCode: string;
  readonly prefecture: string;
  readonly city: string;
  readonly street: string;
  readonly building?: string;
  readonly phoneNumber?: string;
  readonly productName: string;
  readonly totalPrice: number;
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
      postalCode: order.buyer.address.postalCode.toString(),
      prefecture: order.buyer.address.prefecture.toString(),
      city: order.buyer.address.city,
      street: order.buyer.address.street,
      building: order.buyer.address.building,
      phoneNumber: order.buyer.phoneNumber?.toString(),
      productName: order.products.map((p) => p.name).join('、'),
      totalPrice: order.totalPrice,
      status: order.status.toString(),
      orderedAt: order.orderedAt.toISOString(),
      shippedAt: order.shippedAt?.toISOString() ?? null,
    };
  }
}

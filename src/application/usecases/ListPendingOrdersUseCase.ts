import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';

export interface PendingOrderDto {
  readonly orderId: string;
  readonly platform: string;
  readonly buyerName: string;
  readonly productName: string;
  readonly orderedAt: Date;
  readonly daysSinceOrder: number;
  readonly isOverdue: boolean;
}

export class ListPendingOrdersUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly overdueSpec: OverdueOrderSpecification,
  ) {}

  async execute(): Promise<PendingOrderDto[]> {
    const orders = await this.orderRepository.findByStatus(OrderStatus.Pending);
    return orders.map((order) => this.toDto(order));
  }

  private toDto(order: Order): PendingOrderDto {
    return {
      orderId: order.orderId.toString(),
      platform: order.platform.toString(),
      buyerName: order.buyer.name.toString(),
      productName: order.product.name,
      orderedAt: order.orderedAt,
      daysSinceOrder: order.getDaysSinceOrder(),
      isOverdue: this.overdueSpec.isSatisfiedBy(order),
    };
  }
}

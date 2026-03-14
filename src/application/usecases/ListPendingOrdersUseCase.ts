import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OverdueOrderSpecification } from '@/domain/specifications/OverdueOrderSpecification';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';

export interface PendingOrderDto {
  readonly orderId: string;
  readonly platform: string;
  readonly buyerName: string;
  readonly productName: string;
  readonly orderedAt: string;
  readonly daysSinceOrder: number;
  readonly isOverdue: boolean;
  readonly transactionUrl: string;
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
    const orderId = order.orderId.toString();
    const platform = order.platform.toString();
    return {
      orderId,
      platform,
      buyerName: order.buyer.name.toString(),
      productName: order.products.map((p) => p.name).join('、'),
      orderedAt: order.orderedAt.toISOString(),
      daysSinceOrder: order.getDaysSinceOrder(),
      isOverdue: this.overdueSpec.isSatisfiedBy(order),
      transactionUrl: this.buildTransactionUrl(platform, orderId),
    };
  }

  private buildTransactionUrl(platform: string, orderId: string): string {
    switch (platform) {
      case 'minne':
        return `https://minne.com/account/orders/${orderId}`;
      case 'creema':
        return 'https://www.creema.jp/my/tradenavi/list';
      default:
        return '';
    }
  }
}

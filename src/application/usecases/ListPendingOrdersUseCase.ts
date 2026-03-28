import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { ProductNameResolver } from '@/domain/ports/ProductNameResolver';
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

class IdentityProductNameResolver implements ProductNameResolver {
  async resolve(name: string): Promise<string> {
    return name;
  }
}

export class ListPendingOrdersUseCase {
  private readonly productNameResolver: ProductNameResolver;

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly overdueSpec: OverdueOrderSpecification,
    productNameResolver?: ProductNameResolver,
  ) {
    this.productNameResolver = productNameResolver ?? new IdentityProductNameResolver();
  }

  async execute(): Promise<PendingOrderDto[]> {
    const orders = await this.orderRepository.findByStatus(OrderStatus.Pending);
    return Promise.all(orders.map((order) => this.toDto(order)));
  }

  private async toDto(order: Order): Promise<PendingOrderDto> {
    const orderId = order.orderId.toString();
    const platform = order.platform.toString();
    const resolvedNames = await Promise.all(
      order.products.map((p) => this.productNameResolver.resolve(p.name)),
    );
    return {
      orderId,
      platform,
      buyerName: order.buyer.name.toString(),
      productName: resolvedNames.join('、'),
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

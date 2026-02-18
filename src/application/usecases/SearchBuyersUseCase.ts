import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';

export interface SearchBuyersInput {
  readonly buyerName: string;
}

export interface BuyerOrderHistoryDto {
  readonly orderId: string;
  readonly platform: string;
  readonly productName: string;
  readonly price: number;
  readonly status: string;
  readonly orderedAt: string;
}

export interface BuyerDetailDto {
  readonly buyerKey: string;
  readonly buyerName: string;
  readonly postalCode: string;
  readonly prefecture: string;
  readonly city: string;
  readonly street: string;
  readonly building?: string;
  readonly phoneNumber?: string;
  readonly orderCount: number;
  readonly totalAmount: number;
  readonly firstOrderedAt: string;
  readonly lastOrderedAt: string;
  readonly orderHistory: BuyerOrderHistoryDto[];
}

const MAX_RESULTS = 100;

export class SearchBuyersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(input: SearchBuyersInput): Promise<BuyerDetailDto[]> {
    const keyword = input.buyerName.trim();
    if (keyword.length === 0) {
      return [];
    }

    const matchedOrders = await this.orderRepository.findByBuyerName(keyword);
    const grouped = this.groupByBuyerIdentity(matchedOrders);

    return [...grouped.entries()]
      .map(([buyerKey, orders]) => this.toBuyerDetail(buyerKey, orders))
      .sort((a, b) => b.lastOrderedAt.localeCompare(a.lastOrderedAt))
      .slice(0, MAX_RESULTS);
  }

  private groupByBuyerIdentity(orders: Order[]): Map<string, Order[]> {
    const grouped = new Map<string, Order[]>();

    for (const order of orders) {
      const key = this.toBuyerIdentityKey(order);
      const current = grouped.get(key) ?? [];
      current.push(order);
      grouped.set(key, current);
    }

    return grouped;
  }

  private toBuyerIdentityKey(order: Order): string {
    const address = order.buyer.address;
    return [
      order.buyer.name.toString(),
      address.postalCode.toString(),
      address.prefecture.toString(),
      address.city,
      address.street,
      address.building ?? '',
      order.buyer.phoneNumber?.toString() ?? '',
    ].join('::');
  }

  private toBuyerDetail(buyerKey: string, orders: Order[]): BuyerDetailDto {
    const sorted = [...orders].sort((a, b) => b.orderedAt.getTime() - a.orderedAt.getTime());
    const latest = sorted[0];
    const oldest = sorted[sorted.length - 1];

    if (latest === undefined || oldest === undefined) {
      throw new Error('購入者情報の変換に失敗しました');
    }

    const totalAmount = sorted.reduce((sum, order) => sum + order.product.price, 0);

    return {
      buyerKey,
      buyerName: latest.buyer.name.toString(),
      postalCode: latest.buyer.address.postalCode.toString(),
      prefecture: latest.buyer.address.prefecture.toString(),
      city: latest.buyer.address.city,
      street: latest.buyer.address.street,
      building: latest.buyer.address.building,
      phoneNumber: latest.buyer.phoneNumber?.toString(),
      orderCount: sorted.length,
      totalAmount,
      firstOrderedAt: oldest.orderedAt.toISOString(),
      lastOrderedAt: latest.orderedAt.toISOString(),
      orderHistory: sorted.map((order) => ({
        orderId: order.orderId.toString(),
        platform: order.platform.toString(),
        productName: order.product.name,
        price: order.product.price,
        status: order.status.toString(),
        orderedAt: order.orderedAt.toISOString(),
      })),
    };
  }
}

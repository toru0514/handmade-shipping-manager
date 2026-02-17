import { Buyer } from '../valueObjects/Buyer';
import { OrderId } from '../valueObjects/OrderId';
import { OrderStatus } from '../valueObjects/OrderStatus';
import { Platform } from '../valueObjects/Platform';
import { Product } from '../valueObjects/Product';
import { ShippingMethod } from '../valueObjects/ShippingMethod';
import { TrackingNumber } from '../valueObjects/TrackingNumber';

export interface OrderRegistered {
  readonly type: 'OrderRegistered';
  readonly orderId: string;
  readonly occurredAt: Date;
}

export interface OrderShipped {
  readonly type: 'OrderShipped';
  readonly orderId: string;
  readonly shippingMethod: string;
  readonly trackingNumber?: string;
  readonly occurredAt: Date;
}

export type OrderDomainEvent = OrderRegistered | OrderShipped;

interface NewOrderParams {
  orderId: OrderId;
  platform: Platform;
  buyer: Buyer;
  product: Product;
  orderedAt?: Date;
}

interface ReconstitutedOrderParams {
  orderId: OrderId;
  platform: Platform;
  buyer: Buyer;
  product: Product;
  status: OrderStatus;
  orderedAt: Date;
  shippedAt?: Date;
  shippingMethod?: ShippingMethod;
  trackingNumber?: TrackingNumber;
}

/**
 * Order — 注文集約ルート
 */
export class Order {
  readonly orderId: OrderId;
  readonly platform: Platform;
  readonly buyer: Buyer;
  readonly product: Product;
  status: OrderStatus;
  readonly orderedAt: Date;
  shippedAt?: Date;
  shippingMethod?: ShippingMethod;
  trackingNumber?: TrackingNumber;

  private domainEvents: OrderDomainEvent[] = [];

  private constructor(params: ReconstitutedOrderParams, options?: { suppressEvent?: boolean }) {
    this.orderId = params.orderId;
    this.platform = params.platform;
    this.buyer = params.buyer;
    this.product = params.product;
    this.status = params.status;
    this.orderedAt = params.orderedAt;
    this.shippedAt = params.shippedAt;
    this.shippingMethod = params.shippingMethod;
    this.trackingNumber = params.trackingNumber;

    if (!options?.suppressEvent) {
      this.domainEvents.push({
        type: 'OrderRegistered',
        orderId: this.orderId.toString(),
        occurredAt: new Date(),
      });
    }
  }

  static create(params: NewOrderParams): Order {
    return new Order({
      orderId: params.orderId,
      platform: params.platform,
      buyer: params.buyer,
      product: params.product,
      status: OrderStatus.Pending,
      orderedAt: params.orderedAt ?? new Date(),
    });
  }

  static reconstitute(params: ReconstitutedOrderParams): Order {
    return new Order(params, { suppressEvent: true });
  }

  /**
   * DR-ORD-003, DR-ORD-004, DR-ORD-005
   */
  markAsShipped(method: ShippingMethod, trackingNumber?: TrackingNumber): void {
    if (!this.status.isPending()) {
      throw new Error('発送済みの注文は変更できません');
    }

    this.status = OrderStatus.Shipped;
    this.shippedAt = new Date();
    this.shippingMethod = method;
    this.trackingNumber = trackingNumber;

    this.domainEvents.push({
      type: 'OrderShipped',
      orderId: this.orderId.toString(),
      shippingMethod: method.toString(),
      trackingNumber: trackingNumber?.toString(),
      occurredAt: this.shippedAt,
    });
  }

  isOverdue(): boolean {
    return this.status.isPending() && this.getDaysSinceOrder() >= 3;
  }

  getDaysSinceOrder(): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - this.orderedAt.getTime();
    return Math.floor(elapsed / millisecondsPerDay);
  }

  pullDomainEvents(): OrderDomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}

import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';

export interface OrderRepository<TOrder = unknown> {
  findById(orderId: OrderId): Promise<TOrder | null>;
  findByStatus(status: OrderStatus): Promise<TOrder[]>;
  findByBuyerName(name: string): Promise<TOrder[]>;
  save(order: TOrder): Promise<void>;
  exists(orderId: OrderId): Promise<boolean>;
  findAll(): Promise<TOrder[]>;
}

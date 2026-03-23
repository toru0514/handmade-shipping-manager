import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import type { Logger } from '@/infrastructure/logging/Logger';

export class DualWriteOrderRepository implements OrderRepository<Order> {
  constructor(
    private readonly primary: OrderRepository<Order>,
    private readonly secondary: OrderRepository<Order>,
    private readonly logger: Logger,
  ) {}

  async findById(orderId: OrderId): Promise<Order | null> {
    return this.primary.findById(orderId);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return this.primary.findByStatus(status);
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    return this.primary.findByBuyerName(name);
  }

  async findAll(): Promise<Order[]> {
    return this.primary.findAll();
  }

  async save(order: Order): Promise<void> {
    await this.primary.save(order);
    try {
      await this.secondary.save(order);
    } catch (e) {
      this.logger.warn('Secondary write failed (Order.save)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async saveAll(orders: Order[]): Promise<void> {
    await this.primary.saveAll(orders);
    try {
      await this.secondary.saveAll(orders);
    } catch (e) {
      this.logger.warn('Secondary write failed (Order.saveAll)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async exists(orderId: OrderId): Promise<boolean> {
    return this.primary.exists(orderId);
  }
}

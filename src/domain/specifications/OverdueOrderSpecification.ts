import { Order } from '../entities/Order';

export class OverdueOrderSpecification {
  isSatisfiedBy(order: Order): boolean {
    return order.status.isPending() && order.getDaysSinceOrder() >= 3;
  }
}

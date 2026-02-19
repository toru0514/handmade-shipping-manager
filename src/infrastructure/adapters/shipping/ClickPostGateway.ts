import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { Order } from '@/domain/entities/Order';

export interface ClickPostGateway {
  issue(order: Order): Promise<ClickPostLabel>;
}

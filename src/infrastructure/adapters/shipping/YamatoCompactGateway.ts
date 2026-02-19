import { Order } from '@/domain/entities/Order';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';

export interface YamatoCompactGateway {
  issue(order: Order): Promise<YamatoCompactLabel>;
}

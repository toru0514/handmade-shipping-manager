import { Order } from '../entities/Order';
import { ShippingLabel } from '../entities/ShippingLabel';

export interface SyncUpsertResult {
  readonly synced: number;
  readonly errors: string[];
}

export interface OrderSyncRepository {
  upsertOrders(orders: Order[]): Promise<SyncUpsertResult>;
  upsertShippingLabels(labels: ShippingLabel[]): Promise<SyncUpsertResult>;
}

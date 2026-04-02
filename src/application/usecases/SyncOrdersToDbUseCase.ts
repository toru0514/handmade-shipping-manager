import { OrderRepository } from '@/domain/ports/OrderRepository';
import { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { OrderSyncRepository } from '@/domain/ports/OrderSyncRepository';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';

export interface ProductNameMapSyncer {
  syncToDb(): Promise<void>;
}

export interface SyncResult {
  readonly ordersSynced: number;
  readonly labelsSynced: number;
  readonly productNameMapSynced: boolean;
  readonly errors: string[];
}

export class SyncOrdersToDbUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly labelRepository: ShippingLabelRepository<ShippingLabel>,
    private readonly syncRepository: OrderSyncRepository,
    private readonly productNameMapSyncer?: ProductNameMapSyncer,
  ) {}

  async execute(): Promise<SyncResult> {
    const errors: string[] = [];

    // 注文を同期
    const orders = await this.orderRepository.findAll();
    const orderResult = await this.syncRepository.upsertOrders(orders);
    errors.push(...orderResult.errors);

    // 伝票を同期（注文に紐づく伝票を全件取得）
    const allLabels: ShippingLabel[] = [];
    for (const order of orders) {
      const labels = await this.labelRepository.findByOrderId(order.orderId);
      allLabels.push(...labels);
    }

    let labelsSynced = 0;
    if (allLabels.length > 0) {
      const labelResult = await this.syncRepository.upsertShippingLabels(allLabels);
      labelsSynced = labelResult.synced;
      errors.push(...labelResult.errors);
    }

    // ProductNameMap を同期
    let productNameMapSynced = false;
    if (this.productNameMapSyncer) {
      try {
        await this.productNameMapSyncer.syncToDb();
        productNameMapSynced = true;
      } catch (e) {
        errors.push(
          `ProductNameMap同期エラー: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return { ordersSynced: orderResult.synced, labelsSynced, productNameMapSynced, errors };
  }
}

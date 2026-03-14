import { OrderRepository } from '@/domain/ports/OrderRepository';
import { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { SupabaseOrderSyncRepository } from '@/infrastructure/adapters/persistence/SupabaseOrderSyncRepository';

export interface SyncResult {
  readonly ordersSynced: number;
  readonly labelsSynced: number;
  readonly errors: string[];
}

export class SyncOrdersToDbUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly labelRepository: ShippingLabelRepository<ShippingLabel>,
    private readonly syncRepository: SupabaseOrderSyncRepository,
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

    return { ordersSynced: orderResult.synced, labelsSynced, errors };
  }
}

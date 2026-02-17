import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';

export interface ShippingLabelRepository<TShippingLabel = unknown> {
  findById(labelId: LabelId): Promise<TShippingLabel | null>;
  findByOrderId(orderId: OrderId): Promise<TShippingLabel[]>;
  save(label: TShippingLabel): Promise<void>;
}

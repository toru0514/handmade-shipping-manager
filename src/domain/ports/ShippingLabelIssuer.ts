import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';

export interface ShippingLabelIssuer<TOrder = unknown, TShippingLabel = unknown> {
  issue(order: TOrder, method: ShippingMethod): Promise<TShippingLabel>;
}

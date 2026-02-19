import { Order } from '@/domain/entities/Order';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { ShippingLabelIssuer } from '@/domain/ports/ShippingLabelIssuer';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { ClickPostGateway } from './ClickPostGateway';
import { YamatoCompactGateway } from './YamatoCompactGateway';

export class ShippingLabelIssuerImpl implements ShippingLabelIssuer<Order, ShippingLabel> {
  constructor(
    private readonly clickPostGateway: ClickPostGateway,
    private readonly yamatoCompactGateway: YamatoCompactGateway,
  ) {}

  async issue(order: Order, method: ShippingMethod): Promise<ShippingLabel> {
    const value = method.toString();

    if (value === 'click_post') {
      return this.clickPostGateway.issue(order);
    }

    if (value === 'yamato_compact') {
      return this.yamatoCompactGateway.issue(order);
    }

    throw new Error(`未対応の配送方法です: ${value}`);
  }
}

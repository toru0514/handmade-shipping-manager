import { Order } from '@/domain/entities/Order';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { ShippingLabelIssuer } from '@/domain/ports/ShippingLabelIssuer';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { ClickPostGateway } from './ClickPostGateway';
import { YamatoCompactGateway } from './YamatoCompactGateway';

function assertNever(value: never): never {
  throw new Error(`未対応の配送方法です: ${String(value)}`);
}

export class ShippingLabelIssuerImpl implements ShippingLabelIssuer<Order, ShippingLabel> {
  constructor(
    private readonly clickPostGateway: ClickPostGateway,
    private readonly yamatoCompactGateway: YamatoCompactGateway,
  ) {}

  async issue(order: Order, method: ShippingMethod): Promise<ShippingLabel> {
    switch (method.value) {
      case 'click_post':
        return this.clickPostGateway.issue(order);
      case 'yamato_compact':
        return this.yamatoCompactGateway.issue(order);
      default:
        return assertNever(method.value);
    }
  }
}

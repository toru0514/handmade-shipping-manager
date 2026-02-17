import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';

export const ShippingLabelTypeValues = ['click_post', 'yamato_compact'] as const;
export type ShippingLabelTypeValue = (typeof ShippingLabelTypeValues)[number];

export const LabelStatusValues = ['issued'] as const;
export type LabelStatusValue = (typeof LabelStatusValues)[number];

type ShippingLabelParams = {
  labelId: LabelId;
  orderId: OrderId;
  type: ShippingLabelTypeValue;
  status?: LabelStatusValue;
  issuedAt?: Date;
  expiresAt?: Date | null;
};

/**
 * ShippingLabel — 伝票集約ルート
 */
export class ShippingLabel {
  readonly labelId: LabelId;
  readonly orderId: OrderId;
  readonly type: ShippingLabelTypeValue;
  readonly status: LabelStatusValue;
  readonly issuedAt: Date;
  readonly expiresAt?: Date;

  constructor(params: ShippingLabelParams) {
    this.labelId = params.labelId;
    this.orderId = params.orderId;
    this.type = params.type;
    this.status = params.status ?? 'issued';
    this.issuedAt = new Date((params.issuedAt ?? new Date()).getTime());
    this.expiresAt = params.expiresAt ? new Date(params.expiresAt.getTime()) : undefined;
  }

  isExpired(referenceDate: Date = new Date()): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return this.expiresAt.getTime() < referenceDate.getTime();
  }
}

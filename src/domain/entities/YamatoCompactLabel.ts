import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';

type YamatoCompactLabelParams = {
  labelId: LabelId;
  orderId: OrderId;
  qrCode: string;
  waybillNumber: string;
  issuedAt?: Date;
};

/**
 * YamatoCompactLabel — 宅急便コンパクト伝票
 * DR-LBL-001: 発行から14日間有効
 */
export class YamatoCompactLabel extends ShippingLabel {
  static readonly EXPIRY_DAYS = 14;

  readonly qrCode: string;
  readonly waybillNumber: string;

  constructor(params: YamatoCompactLabelParams) {
    if (!params.qrCode || params.qrCode.trim().length === 0) {
      throw new Error('QRコードは空にできません');
    }
    if (!params.waybillNumber || params.waybillNumber.trim().length === 0) {
      throw new Error('送り状番号は空にできません');
    }

    const issuedAt = params.issuedAt ?? new Date();
    const expiresAt = new Date(issuedAt.getTime());
    expiresAt.setDate(expiresAt.getDate() + YamatoCompactLabel.EXPIRY_DAYS);

    super({
      labelId: params.labelId,
      orderId: params.orderId,
      type: 'yamato_compact',
      status: 'issued',
      issuedAt,
      expiresAt,
    });

    this.qrCode = params.qrCode;
    this.waybillNumber = params.waybillNumber;
  }
}

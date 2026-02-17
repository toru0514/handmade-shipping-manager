import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

type ClickPostLabelParams = {
  labelId: LabelId;
  orderId: OrderId;
  pdfData: string;
  trackingNumber: TrackingNumber;
  issuedAt?: Date;
};

/**
 * ClickPostLabel — クリックポスト伝票
 */
export class ClickPostLabel extends ShippingLabel {
  readonly pdfData: string;
  readonly trackingNumber: TrackingNumber;

  constructor(params: ClickPostLabelParams) {
    if (!params.pdfData || params.pdfData.trim().length === 0) {
      throw new Error('PDFデータは空にできません');
    }

    super({
      labelId: params.labelId,
      orderId: params.orderId,
      type: 'click_post',
      status: 'issued',
      issuedAt: params.issuedAt,
    });

    this.pdfData = params.pdfData;
    this.trackingNumber = params.trackingNumber;
  }
}

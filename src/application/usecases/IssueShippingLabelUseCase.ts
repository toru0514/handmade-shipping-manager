import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { Order } from '@/domain/entities/Order';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { ShippingLabelIssuer } from '@/domain/ports/ShippingLabelIssuer';
import { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import {
  InvalidLabelIssueInputError,
  InvalidLabelIssueOperationError,
  OrderNotFoundError,
} from './IssueShippingLabelErrors';

const DUPLICATE_LABEL_WARNING = '同一注文に既存の伝票があります（重複発行）';

export interface IssueShippingLabelInput {
  readonly orderId: string;
  readonly shippingMethod: string;
}

export interface IssueShippingLabelResultDto {
  readonly orderId: string;
  readonly labelId: string;
  readonly shippingMethod: string;
  readonly labelType: string;
  readonly status: string;
  readonly issuedAt: string;
  readonly expiresAt?: string;
  readonly pdfData?: string;
  readonly trackingNumber?: string;
  readonly qrCode?: string;
  readonly waybillNumber?: string;
  readonly warnings?: string[];
}

export class IssueShippingLabelUseCase {
  constructor(
    private readonly orderRepository: OrderRepository<Order>,
    private readonly shippingLabelRepository: ShippingLabelRepository<ShippingLabel>,
    private readonly shippingLabelIssuer: ShippingLabelIssuer<Order, ShippingLabel>,
  ) {}

  async execute(input: IssueShippingLabelInput): Promise<IssueShippingLabelResultDto> {
    const order = await this.orderRepository.findById(new OrderId(input.orderId));
    if (order === null) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (!order.status.isPending()) {
      throw new InvalidLabelIssueOperationError('発送済み注文には伝票を発行できません');
    }

    let method: ShippingMethod;
    try {
      method = new ShippingMethod(input.shippingMethod);
    } catch (error) {
      const message = error instanceof Error ? error.message : '配送方法が不正です';
      throw new InvalidLabelIssueInputError(message);
    }

    const existingLabels = await this.shippingLabelRepository.findByOrderId(order.orderId);
    const warnings = existingLabels.length > 0 ? [DUPLICATE_LABEL_WARNING] : undefined;

    const issuedLabel = await this.shippingLabelIssuer.issue(order, method);
    await this.shippingLabelRepository.save(issuedLabel);

    return {
      orderId: order.orderId.toString(),
      labelId: issuedLabel.labelId.toString(),
      shippingMethod: method.toString(),
      labelType: issuedLabel.type,
      status: issuedLabel.status,
      issuedAt: issuedLabel.issuedAt.toISOString(),
      expiresAt: issuedLabel.expiresAt?.toISOString(),
      pdfData: issuedLabel instanceof ClickPostLabel ? issuedLabel.pdfData : undefined,
      trackingNumber:
        issuedLabel instanceof ClickPostLabel ? issuedLabel.trackingNumber.toString() : undefined,
      qrCode: issuedLabel instanceof YamatoCompactLabel ? issuedLabel.qrCode : undefined,
      waybillNumber:
        issuedLabel instanceof YamatoCompactLabel ? issuedLabel.waybillNumber : undefined,
      warnings,
    };
  }
}

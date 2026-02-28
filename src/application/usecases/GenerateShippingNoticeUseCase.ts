import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { ShippingMethodLabelResolver } from '@/domain/ports/ShippingMethodLabelResolver';
import { MessageGenerator, MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';

export interface GenerateShippingNoticeInput {
  readonly orderId: string;
}

export interface GenerateShippingNoticeResultDto {
  readonly orderId: string;
  readonly message: string;
}

export class ShippingNoticeOrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`対象注文が見つかりません: ${orderId}`);
    this.name = 'ShippingNoticeOrderNotFoundError';
  }
}

export class ShippingNoticeTemplateNotFoundError extends Error {
  constructor() {
    super('発送連絡テンプレートが見つかりません');
    this.name = 'ShippingNoticeTemplateNotFoundError';
  }
}

export class ShippingNoticeOrderNotShippedError extends Error {
  constructor(orderId: string) {
    super(`発送済みではない注文です: ${orderId}`);
    this.name = 'ShippingNoticeOrderNotShippedError';
  }
}

class DefaultShippingMethodLabelResolver implements ShippingMethodLabelResolver {
  async resolve(methodCode: string): Promise<string> {
    if (methodCode === 'click_post') {
      return 'クリックポスト(日本郵便)';
    }
    if (methodCode === 'yamato_compact') {
      return '宅急便コンパクト(ヤマト運輸)';
    }
    return methodCode;
  }
}

export class GenerateShippingNoticeUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly templateRepository: MessageTemplateRepository<MessageTemplate>,
    private readonly messageGenerator: MessageGenerator = new MessageGenerator(),
    private readonly shippingMethodLabelResolver: ShippingMethodLabelResolver = new DefaultShippingMethodLabelResolver(),
  ) {}

  async execute(input: GenerateShippingNoticeInput): Promise<GenerateShippingNoticeResultDto> {
    const order = await this.orderRepository.findById(new OrderId(input.orderId));
    if (order === null) {
      throw new ShippingNoticeOrderNotFoundError(input.orderId);
    }
    if (!order.status.equals(OrderStatus.Shipped)) {
      throw new ShippingNoticeOrderNotShippedError(input.orderId);
    }

    const template = await this.templateRepository.findByType(MessageTemplateType.ShippingNotice);
    if (template === null) {
      throw new ShippingNoticeTemplateNotFoundError();
    }

    const shippingMethodLabel = await this.shippingMethodLabelResolver.resolve(
      order.shippingMethod?.toString() ?? '',
    );
    const message = this.messageGenerator.generate(order, template, {
      shipping_method: shippingMethodLabel,
    });

    return {
      orderId: order.orderId.toString(),
      message: message.toString(),
    };
  }
}

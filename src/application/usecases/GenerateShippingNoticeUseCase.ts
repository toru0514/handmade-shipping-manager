import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { MessageGenerator, MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';

export interface GenerateShippingNoticeInput {
  readonly orderId: string;
  /** クライアントから渡されたテンプレート本文。指定時はリポジトリのデフォルトより優先する。 */
  readonly templateContent?: string;
}

const ALL_MESSAGE_VARIABLES: { readonly name: string }[] = [
  { name: 'buyer_name' },
  { name: 'product_name' },
  { name: 'price' },
  { name: 'order_id' },
  { name: 'platform' },
  { name: 'shipping_method' },
  { name: 'tracking_number' },
  { name: 'tracking_url' },
  { name: 'shipped_at' },
];

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

export class GenerateShippingNoticeUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly templateRepository: MessageTemplateRepository<MessageTemplate>,
    private readonly messageGenerator: MessageGenerator = new MessageGenerator(),
  ) {}

  async execute(input: GenerateShippingNoticeInput): Promise<GenerateShippingNoticeResultDto> {
    const order = await this.orderRepository.findById(new OrderId(input.orderId));
    if (order === null) {
      throw new ShippingNoticeOrderNotFoundError(input.orderId);
    }
    if (!order.status.equals(OrderStatus.Shipped)) {
      throw new ShippingNoticeOrderNotShippedError(input.orderId);
    }

    let template: MessageTemplate | null;
    if (input.templateContent !== undefined) {
      template = {
        id: 'client-provided',
        type: MessageTemplateType.ShippingNotice,
        content: input.templateContent,
        variables: ALL_MESSAGE_VARIABLES,
      };
    } else {
      template = await this.templateRepository.findByType(MessageTemplateType.ShippingNotice);
    }
    if (template === null) {
      throw new ShippingNoticeTemplateNotFoundError();
    }

    const message = this.messageGenerator.generate(order, template);

    return {
      orderId: order.orderId.toString(),
      message: message.toString(),
    };
  }
}

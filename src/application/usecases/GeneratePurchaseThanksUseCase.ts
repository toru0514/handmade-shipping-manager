import { OrderRepository } from '@/domain/ports/OrderRepository';
import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageGenerator, MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { OrderId } from '@/domain/valueObjects/OrderId';

export interface GeneratePurchaseThanksInput {
  readonly orderId: string;
  /** クライアントから渡されたテンプレート本文。指定時はリポジトリのデフォルトより優先する。 */
  readonly templateContent?: string;
}

// MessageGenerator が置換できるすべての変数
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

export interface GeneratePurchaseThanksResultDto {
  readonly orderId: string;
  readonly message: string;
}

export class PurchaseThanksOrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`対象注文が見つかりません: ${orderId}`);
    this.name = 'PurchaseThanksOrderNotFoundError';
  }
}

export class PurchaseThanksTemplateNotFoundError extends Error {
  constructor() {
    super('購入お礼テンプレートが見つかりません');
    this.name = 'PurchaseThanksTemplateNotFoundError';
  }
}

export class GeneratePurchaseThanksUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly templateRepository: MessageTemplateRepository<MessageTemplate>,
    private readonly messageGenerator: MessageGenerator = new MessageGenerator(),
  ) {}

  async execute(input: GeneratePurchaseThanksInput): Promise<GeneratePurchaseThanksResultDto> {
    const order = await this.orderRepository.findById(new OrderId(input.orderId));
    if (order === null) {
      throw new PurchaseThanksOrderNotFoundError(input.orderId);
    }

    let template: MessageTemplate | null;
    if (input.templateContent !== undefined) {
      template = {
        id: 'client-provided',
        type: MessageTemplateType.PurchaseThanks,
        content: input.templateContent,
        variables: ALL_MESSAGE_VARIABLES,
      };
    } else {
      template = await this.templateRepository.findByType(MessageTemplateType.PurchaseThanks);
    }
    if (template === null) {
      throw new PurchaseThanksTemplateNotFoundError();
    }

    const message = this.messageGenerator.generate(order, template);

    return {
      orderId: order.orderId.toString(),
      message: message.toString(),
    };
  }
}

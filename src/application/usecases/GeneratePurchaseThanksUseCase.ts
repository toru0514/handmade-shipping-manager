import { OrderRepository } from '@/domain/ports/OrderRepository';
import { PurchaseThanksProductNameResolver } from '@/domain/ports/PurchaseThanksProductNameResolver';
import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageGenerator, MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import { OrderId } from '@/domain/valueObjects/OrderId';

export interface GeneratePurchaseThanksInput {
  readonly orderId: string;
}

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

class IdentityPurchaseThanksProductNameResolver implements PurchaseThanksProductNameResolver {
  async resolve(originalProductName: string): Promise<string> {
    return originalProductName;
  }
}

export class GeneratePurchaseThanksUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly templateRepository: MessageTemplateRepository<MessageTemplate>,
    private readonly messageGenerator: MessageGenerator = new MessageGenerator(),
    private readonly productNameResolver: PurchaseThanksProductNameResolver = new IdentityPurchaseThanksProductNameResolver(),
  ) {}

  async execute(input: GeneratePurchaseThanksInput): Promise<GeneratePurchaseThanksResultDto> {
    const order = await this.orderRepository.findById(new OrderId(input.orderId));
    if (order === null) {
      throw new PurchaseThanksOrderNotFoundError(input.orderId);
    }

    const template = await this.templateRepository.findByType(MessageTemplateType.PurchaseThanks);
    if (template === null) {
      throw new PurchaseThanksTemplateNotFoundError();
    }

    const mappedProductName = await this.productNameResolver.resolve(order.product.name);
    const message = this.messageGenerator.generate(order, template, {
      product_name: mappedProductName,
    });

    return {
      orderId: order.orderId.toString(),
      message: message.toString(),
    };
  }
}

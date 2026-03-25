import type { OrderRepository } from '@/domain/ports/OrderRepository';
import type { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import type { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import type { Order } from '@/domain/entities/Order';
import type { ShippingLabel } from '@/domain/entities/ShippingLabel';
import type { MessageTemplate } from '@/domain/services/MessageGenerator';

export interface RestoreResult {
  readonly success: boolean;
  readonly failedStep?: string;
  readonly error?: string;
  readonly restoredCounts: {
    readonly orders: number;
    readonly shippingLabels: number;
    readonly messageTemplates: number;
  };
}

export class RestoreFromDbUseCase {
  constructor(
    private readonly sourceOrderRepo: OrderRepository<Order>,
    private readonly targetOrderRepo: OrderRepository<Order>,
    private readonly sourceLabelRepo: ShippingLabelRepository<ShippingLabel>,
    private readonly targetLabelRepo: ShippingLabelRepository<ShippingLabel>,
    private readonly sourceTemplateRepo: MessageTemplateRepository<MessageTemplate>,
    private readonly targetTemplateRepo: MessageTemplateRepository<MessageTemplate>,
  ) {}

  async execute(): Promise<RestoreResult> {
    const counts = { orders: 0, shippingLabels: 0, messageTemplates: 0 };

    // Step 1: Restore orders
    try {
      const orders = await this.sourceOrderRepo.findAll();
      if (orders.length > 0) {
        await this.targetOrderRepo.saveAll(orders);
      }
      counts.orders = orders.length;
    } catch (e) {
      return {
        success: false,
        failedStep: 'orders',
        error: e instanceof Error ? e.message : String(e),
        restoredCounts: counts,
      };
    }

    // Step 2: Restore shipping labels
    try {
      const labels = await this.sourceLabelRepo.findAll();
      if (labels.length > 0) {
        await this.targetLabelRepo.saveAll(labels);
      }
      counts.shippingLabels = labels.length;
    } catch (e) {
      return {
        success: false,
        failedStep: 'shippingLabels',
        error: e instanceof Error ? e.message : String(e),
        restoredCounts: counts,
      };
    }

    // Step 3: Restore message templates
    try {
      const templates = await this.sourceTemplateRepo.findAll();
      if (templates.length > 0) {
        await this.targetTemplateRepo.saveAll(templates);
      }
      counts.messageTemplates = templates.length;
    } catch (e) {
      return {
        success: false,
        failedStep: 'messageTemplates',
        error: e instanceof Error ? e.message : String(e),
        restoredCounts: counts,
      };
    }

    return {
      success: true,
      restoredCounts: counts,
    };
  }
}

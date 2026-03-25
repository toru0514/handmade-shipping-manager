import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import type { Logger } from '@/infrastructure/logging/Logger';

export class DualWriteShippingLabelRepository implements ShippingLabelRepository<ShippingLabel> {
  constructor(
    private readonly primary: ShippingLabelRepository<ShippingLabel>,
    private readonly secondary: ShippingLabelRepository<ShippingLabel>,
    private readonly logger: Logger,
  ) {}

  async findById(labelId: LabelId): Promise<ShippingLabel | null> {
    return this.primary.findById(labelId);
  }

  async findByOrderId(orderId: OrderId): Promise<ShippingLabel[]> {
    return this.primary.findByOrderId(orderId);
  }

  async findAll(): Promise<ShippingLabel[]> {
    return this.primary.findAll();
  }

  async save(label: ShippingLabel): Promise<void> {
    await this.primary.save(label);
    try {
      await this.secondary.save(label);
    } catch (e) {
      this.logger.warn('Secondary write failed (ShippingLabel.save)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async saveAll(labels: ShippingLabel[]): Promise<void> {
    await this.primary.saveAll(labels);
    try {
      await this.secondary.saveAll(labels);
    } catch (e) {
      this.logger.warn('Secondary write failed (ShippingLabel.saveAll)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

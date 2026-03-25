import type { MessageTemplate } from '@/domain/services/MessageGenerator';
import type { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';
import type { Logger } from '@/infrastructure/logging/Logger';

export class DualWriteMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  constructor(
    private readonly primary: MessageTemplateRepository<MessageTemplate>,
    private readonly secondary: MessageTemplateRepository<MessageTemplate>,
    private readonly logger: Logger,
  ) {}

  async findByType(type: MessageTemplateType): Promise<MessageTemplate | null> {
    return this.primary.findByType(type);
  }

  async findAll(): Promise<MessageTemplate[]> {
    return this.primary.findAll();
  }

  async save(template: MessageTemplate): Promise<void> {
    await this.primary.save(template);
    try {
      await this.secondary.save(template);
    } catch (e) {
      this.logger.warn('Secondary write failed (MessageTemplate.save)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async saveAll(templates: MessageTemplate[]): Promise<void> {
    await this.primary.saveAll(templates);
    try {
      await this.secondary.saveAll(templates);
    } catch (e) {
      this.logger.warn('Secondary write failed (MessageTemplate.saveAll)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async resetToDefault(type: MessageTemplateType): Promise<MessageTemplate> {
    const template = await this.primary.resetToDefault(type);
    try {
      await this.secondary.save(template);
    } catch (e) {
      this.logger.warn('Secondary write failed (MessageTemplate.resetToDefault)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return template;
  }
}

import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';

export interface MessageTemplateRepository<TMessageTemplate = unknown> {
  findByType(type: MessageTemplateType): Promise<TMessageTemplate | null>;
  save(template: TMessageTemplate): Promise<void>;
  resetToDefault(type: MessageTemplateType): Promise<TMessageTemplate>;
}

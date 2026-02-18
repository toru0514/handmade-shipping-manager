import { UpdateMessageTemplateUseCase } from '@/application/usecases/UpdateMessageTemplateUseCase';
import { LocalStorageMessageTemplateRepository } from '@/infrastructure/adapters/persistence/LocalStorageMessageTemplateRepository';

export function createUpdateMessageTemplateUseCase(): UpdateMessageTemplateUseCase {
  return new UpdateMessageTemplateUseCase(new LocalStorageMessageTemplateRepository());
}

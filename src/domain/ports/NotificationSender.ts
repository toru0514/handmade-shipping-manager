import { Message } from '@/domain/valueObjects/Message';

export interface NotificationSender {
  notify(message: Message): Promise<void>;
}

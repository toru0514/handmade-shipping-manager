import {
  EmailOrderSource,
  EmailOrderSourceOptions,
  UnreadOrderRef,
} from '@/domain/ports/EmailOrderSource';
import { GoogleGmailClient } from '@/infrastructure/external/google/GmailClient';

/**
 * Gmail の creema 購入通知メールを EmailOrderSource ポートとして公開するアダプタ。
 */
export class CreemaEmailOrderSource implements EmailOrderSource {
  constructor(private readonly gmailClient: GoogleGmailClient) {}

  async fetchUnreadOrderRefs(options?: EmailOrderSourceOptions): Promise<UnreadOrderRef[]> {
    return this.gmailClient.fetchUnreadCreemaOrderEmails(options);
  }

  async markAsRead(messageId: string): Promise<void> {
    return this.gmailClient.markAsRead(messageId);
  }
}

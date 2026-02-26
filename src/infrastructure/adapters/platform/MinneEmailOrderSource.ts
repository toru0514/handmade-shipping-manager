import {
  EmailOrderSource,
  EmailOrderSourceOptions,
  UnreadOrderRef,
} from '@/domain/ports/EmailOrderSource';
import { GoogleGmailClient } from '@/infrastructure/external/google/GmailClient';

/**
 * Gmail の minne 購入通知メールを EmailOrderSource ポートとして公開するアダプタ。
 */
export class MinneEmailOrderSource implements EmailOrderSource {
  constructor(private readonly gmailClient: GoogleGmailClient) {}

  async fetchUnreadOrderRefs(options?: EmailOrderSourceOptions): Promise<UnreadOrderRef[]> {
    return this.gmailClient.fetchUnreadMinneOrderEmails(options);
  }

  async markAsRead(messageId: string): Promise<void> {
    return this.gmailClient.markAsRead(messageId);
  }
}

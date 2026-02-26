import {
  EmailOrderSource,
  EmailOrderSourceOptions,
  UnreadOrderRef,
} from '@/domain/ports/EmailOrderSource';
import { GoogleGmailClient } from '@/infrastructure/external/google/GmailClient';

/**
 * platform 指定に応じて Gmail の未読注文メール取得先を切り替える。
 */
export class PlatformEmailOrderSource implements EmailOrderSource {
  constructor(private readonly gmailClient: GoogleGmailClient) {}

  async fetchUnreadOrderRefs(options?: EmailOrderSourceOptions): Promise<UnreadOrderRef[]> {
    const platform = options?.platform?.trim();
    const withinDays = options?.withinDays;

    if (!platform || platform === 'minne') {
      return this.gmailClient.fetchUnreadMinneOrderEmails({ withinDays });
    }
    if (platform === 'creema') {
      return this.gmailClient.fetchUnreadCreemaOrderEmails({ withinDays });
    }

    throw new Error(`EmailOrderSource 未対応の platform です: ${platform}`);
  }

  async markAsRead(messageId: string): Promise<void> {
    return this.gmailClient.markAsRead(messageId);
  }
}

import type { NotificationSender } from '@/domain/ports/NotificationSender';
import type { Message } from '@/domain/valueObjects/Message';

export class SlackAdapter implements NotificationSender {
  constructor(private readonly webhookUrl: string) {}

  async notify(message: Message): Promise<void> {
    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message.content }),
    });
    if (!res.ok) {
      throw new Error(`Slack 通知に失敗しました (HTTP ${res.status})`);
    }
  }
}

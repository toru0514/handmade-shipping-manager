import { describe, expect, it, vi } from 'vitest';
import { CreemaEmailOrderSource } from '../CreemaEmailOrderSource';

describe('CreemaEmailOrderSource', () => {
  it('未読 creema 注文メールを Gmail クライアントから取得できる', async () => {
    const gmailClient = {
      fetchUnreadCreemaOrderEmails: vi.fn(async () => [
        { messageId: 'm1', orderId: '202602232210-SXD0' },
      ]),
      markAsRead: vi.fn(async () => undefined),
    };

    const source = new CreemaEmailOrderSource(gmailClient as never);
    const refs = await source.fetchUnreadOrderRefs({ withinDays: 7 });

    expect(gmailClient.fetchUnreadCreemaOrderEmails).toHaveBeenCalledWith({ withinDays: 7 });
    expect(refs).toEqual([{ messageId: 'm1', orderId: '202602232210-SXD0' }]);
  });

  it('markAsRead を委譲する', async () => {
    const gmailClient = {
      fetchUnreadCreemaOrderEmails: vi.fn(async () => []),
      markAsRead: vi.fn(async () => undefined),
    };

    const source = new CreemaEmailOrderSource(gmailClient as never);
    await source.markAsRead('m1');

    expect(gmailClient.markAsRead).toHaveBeenCalledWith('m1');
  });
});

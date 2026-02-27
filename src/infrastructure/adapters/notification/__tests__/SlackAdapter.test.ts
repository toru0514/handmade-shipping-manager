import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlackAdapter } from '../SlackAdapter';
import { Message } from '@/domain/valueObjects/Message';

describe('SlackAdapter', () => {
  const webhookUrl = 'https://hooks.slack.com/services/test';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('メッセージ内容を Slack Webhook に POST する', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    const adapter = new SlackAdapter(webhookUrl);
    await adapter.notify(new Message('テスト通知'));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(webhookUrl);
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ text: 'テスト通知' });
  });

  it('Webhook が 4xx を返した場合はエラーをスローする', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 400 }));

    const adapter = new SlackAdapter(webhookUrl);
    await expect(adapter.notify(new Message('失敗テスト'))).rejects.toThrow(
      'Slack 通知に失敗しました (HTTP 400)',
    );
  });
});

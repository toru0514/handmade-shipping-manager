import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resetToDefaultMock } = vi.hoisted(() => ({
  resetToDefaultMock: vi.fn(),
}));

vi.mock('@/infrastructure/di/container', () => ({
  createContainer: vi.fn(() => ({
    getUpdateMessageTemplateUseCase: () => ({
      resetToDefault: resetToDefaultMock,
    }),
  })),
}));

import { POST } from '../route';

describe('POST /api/settings/templates/[type]/reset', () => {
  beforeEach(() => {
    resetToDefaultMock.mockReset();
  });

  it('デフォルトテンプレートにリセットして返す', async () => {
    const defaultTemplate = {
      id: 'default-purchase-thanks',
      type: 'purchase_thanks',
      content: '{{buyer_name}} 様\nデフォルト',
      variables: ['buyer_name'],
    };
    resetToDefaultMock.mockResolvedValueOnce(defaultTemplate);

    const response = await POST(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ type: 'purchase_thanks' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(defaultTemplate);
    expect(resetToDefaultMock).toHaveBeenCalledWith('purchase_thanks');
  });

  it('不明な type は 400 を返す', async () => {
    const response = await POST(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ type: 'unknown_type' }),
    });

    expect(response.status).toBe(400);
  });
});

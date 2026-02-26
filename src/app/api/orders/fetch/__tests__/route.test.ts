import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '@/infrastructure/errors/HttpErrors';

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/infrastructure/di/container', () => ({
  createContainer: vi.fn(() => ({
    getFetchNewOrdersUseCase: () => ({
      execute: executeMock,
    }),
  })),
}));

import { POST } from '../route';

describe('POST /api/orders/fetch', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it('正常時は fetched/skipped/errors を返す', async () => {
    executeMock.mockResolvedValueOnce({
      fetched: 3,
      skipped: 1,
      errors: [],
    });

    const response = await POST(
      new Request('http://localhost/api/orders/fetch?platform=minne', { method: 'POST' }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      fetched: 3,
      skipped: 1,
      errors: [],
    });
    expect(executeMock).toHaveBeenCalledWith({ platform: 'minne' });
  });

  it('platform 未指定時は 400 を返す', async () => {
    const response = await POST(
      new Request('http://localhost/api/orders/fetch', { method: 'POST' }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'platform は必須です',
      },
    });
  });

  it('minne 以外の platform は 400 を返す', async () => {
    const response = await POST(
      new Request('http://localhost/api/orders/fetch?platform=creema', { method: 'POST' }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'platform は minne のみ対応です',
      },
    });
  });

  it('外部サービスエラー時は 503 と統一フォーマットを返す', async () => {
    executeMock.mockRejectedValueOnce(new ExternalServiceError('一時的に利用できません'));

    const response = await POST(
      new Request('http://localhost/api/orders/fetch?platform=minne', { method: 'POST' }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: '一時的に利用できません',
      },
    });
  });

  it('想定外エラー時は 500 と統一フォーマットを返す', async () => {
    executeMock.mockRejectedValueOnce(new Error('unexpected'));

    const response = await POST(
      new Request('http://localhost/api/orders/fetch?platform=minne', { method: 'POST' }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '新規注文の取得に失敗しました',
      },
    });
  });
});

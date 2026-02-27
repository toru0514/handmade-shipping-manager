import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ShippingNoticeOrderNotFoundError,
  ShippingNoticeOrderNotShippedError,
  ShippingNoticeTemplateNotFoundError,
} from '@/application/usecases/GenerateShippingNoticeUseCase';

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/infrastructure/di/container', () => ({
  createContainer: vi.fn(() => ({
    getGenerateShippingNoticeUseCase: () => ({
      execute: executeMock,
    }),
  })),
}));

import { POST } from '../route';

describe('POST /api/orders/[orderId]/message/shipping-notice', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it('正常時は生成されたメッセージを返す', async () => {
    executeMock.mockResolvedValueOnce({
      orderId: 'ORD-001',
      message: '山田 太郎 様\n発送しました。',
    });

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      orderId: 'ORD-001',
      message: '山田 太郎 様\n発送しました。',
    });
  });

  it('orderId が空文字なら 400 を返す', async () => {
    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ orderId: '   ' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'orderId は必須です',
      },
    });
  });

  it('注文未存在エラーは 404 を返す', async () => {
    executeMock.mockRejectedValueOnce(new ShippingNoticeOrderNotFoundError('ORD-404'));

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ orderId: 'ORD-404' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'NOT_FOUND',
        message: '対象注文が見つかりません: ORD-404',
      },
    });
  });

  it('テンプレート未存在エラーは 404 を返す', async () => {
    executeMock.mockRejectedValueOnce(new ShippingNoticeTemplateNotFoundError());

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'NOT_FOUND',
        message: '発送連絡テンプレートが見つかりません',
      },
    });
  });

  it('未発送注文エラーは 400 を返す', async () => {
    executeMock.mockRejectedValueOnce(new ShippingNoticeOrderNotShippedError('ORD-002'));

    const response = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ orderId: 'ORD-002' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '発送済みではない注文です: ORD-002',
      },
    });
  });
});

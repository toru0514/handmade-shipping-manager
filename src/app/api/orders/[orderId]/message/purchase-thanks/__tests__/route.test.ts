import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PurchaseThanksOrderNotFoundError,
  PurchaseThanksTemplateNotFoundError,
} from '@/application/usecases/GeneratePurchaseThanksUseCase';

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/infrastructure/di/container', () => ({
  createContainer: vi.fn(() => ({
    getGeneratePurchaseThanksUseCase: () => ({
      execute: executeMock,
    }),
  })),
}));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown> = {}): Request {
  return new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/orders/[orderId]/message/purchase-thanks', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it('正常時は生成されたメッセージを返す', async () => {
    executeMock.mockResolvedValueOnce({
      orderId: 'ORD-001',
      message: '山田 太郎 様\nありがとうございます。',
    });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      orderId: 'ORD-001',
      message: '山田 太郎 様\nありがとうございます。',
    });
  });

  it('templateContent を渡すと useCase に伝わる', async () => {
    executeMock.mockResolvedValueOnce({ orderId: 'ORD-001', message: 'カスタムメッセージ' });

    await POST(makeRequest({ templateContent: 'カスタムテンプレート' }), {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(executeMock).toHaveBeenCalledWith({
      orderId: 'ORD-001',
      templateContent: 'カスタムテンプレート',
    });
  });

  it('orderId が空文字なら 400 を返す', async () => {
    const response = await POST(makeRequest(), {
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
    executeMock.mockRejectedValueOnce(new PurchaseThanksOrderNotFoundError('ORD-404'));

    const response = await POST(makeRequest(), {
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
    executeMock.mockRejectedValueOnce(new PurchaseThanksTemplateNotFoundError());

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'NOT_FOUND',
        message: '購入お礼テンプレートが見つかりません',
      },
    });
  });
});

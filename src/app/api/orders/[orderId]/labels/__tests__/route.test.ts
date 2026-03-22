import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as routeModule from '../route';

function createMockJobRepository() {
  return {
    enqueue: vi.fn(async (input: { orderId: string; shippingMethod: string }) => ({
      id: '123e4567-e89b-12d3-a456-426614174000',
      orderId: input.orderId,
      shippingMethod: input.shippingMethod,
      status: 'pending' as const,
      createdAt: new Date('2026-03-22T00:00:00.000Z'),
      updatedAt: new Date('2026-03-22T00:00:00.000Z'),
    })),
    findById: vi.fn(),
    findPendingJobs: vi.fn(),
    markAsProcessing: vi.fn(),
    markAsCompleted: vi.fn(),
    markAsFailed: vi.fn(),
  };
}

describe('POST /api/orders/[orderId]/labels', () => {
  afterEach(() => {
    routeModule.resetJobRepositoryFactoryForTest();
    vi.restoreAllMocks();
  });

  it('null ボディは 400 を返す', async () => {
    const request = new NextRequest('http://localhost/api/orders/ORD-001/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'null',
    });

    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'リクエストボディが不正です',
      },
    });
  });

  it('shippingMethod 未指定は 400 を返す', async () => {
    const request = new NextRequest('http://localhost/api/orders/ORD-001/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '配送方法は必須です',
      },
    });
  });

  it('正常系は 202 を返しジョブIDを含む', async () => {
    const mockRepo = createMockJobRepository();
    routeModule.setJobRepositoryFactoryForTest(() => mockRepo);

    const request = new NextRequest('http://localhost/api/orders/ORD-001/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingMethod: 'click_post',
      }),
    });

    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toMatchObject({
      jobId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'pending',
      orderId: 'ORD-001',
      shippingMethod: 'click_post',
    });
    expect(mockRepo.enqueue).toHaveBeenCalledWith({
      orderId: 'ORD-001',
      shippingMethod: 'click_post',
    });
  });

  it('Supabase エラー時は 500 を返す', async () => {
    const mockRepo = createMockJobRepository();
    mockRepo.enqueue.mockRejectedValue(new Error('Supabase connection failed'));
    routeModule.setJobRepositoryFactoryForTest(() => mockRepo);

    const request = new NextRequest('http://localhost/api/orders/ORD-001/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shippingMethod: 'click_post' }),
    });
    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(500);
  });

  it('shippingMethod の前後空白はトリムされる', async () => {
    const mockRepo = createMockJobRepository();
    routeModule.setJobRepositoryFactoryForTest(() => mockRepo);

    const request = new NextRequest('http://localhost/api/orders/ORD-001/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shippingMethod: '  click_post  ' }),
    });
    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(202);
    expect(mockRepo.enqueue).toHaveBeenCalledWith({
      orderId: 'ORD-001',
      shippingMethod: 'click_post',
    });
  });
});

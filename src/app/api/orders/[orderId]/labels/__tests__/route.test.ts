import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import * as routeModule from '../route';

describe('POST /api/orders/[orderId]/labels', () => {
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
});

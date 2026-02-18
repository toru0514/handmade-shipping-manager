import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

describe('POST /api/orders/[orderId]/ship', () => {
  it('null ボディは 400 を返す', async () => {
    const request = new NextRequest('http://localhost/api/orders/ORD-001/ship', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'null',
    });

    const response = await POST(request, {
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

  it('trackingNumber が文字列以外なら 400 を返す', async () => {
    const request = new NextRequest('http://localhost/api/orders/ORD-001/ship', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingMethod: 'click_post',
        trackingNumber: 123456,
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '追跡番号は文字列で指定してください',
      },
    });
  });

  it('shippingMethod 未指定は 400 を返す', async () => {
    const request = new NextRequest('http://localhost/api/orders/ORD-001/ship', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request, {
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

  it('shippingMethod が空文字は 400 を返す', async () => {
    const request = new NextRequest('http://localhost/api/orders/ORD-001/ship', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingMethod: '   ',
      }),
    });

    const response = await POST(request, {
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

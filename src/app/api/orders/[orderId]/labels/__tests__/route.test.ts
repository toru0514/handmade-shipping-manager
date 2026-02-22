import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  InvalidLabelIssueInputError,
  InvalidLabelIssueOperationError,
  OrderNotFoundError,
} from '@/application/usecases/IssueShippingLabelErrors';
import { ExternalServiceError } from '@/infrastructure/errors/HttpErrors';
import * as routeModule from '../route';

describe('POST /api/orders/[orderId]/labels', () => {
  afterEach(() => {
    routeModule.resetIssueShippingLabelUseCaseFactoryForTest();
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

  it('正常系は 200 を返す', async () => {
    const execute = vi.fn(async () => ({
      orderId: 'ORD-001',
      labelId: 'LBL-001',
      shippingMethod: 'click_post',
      labelType: 'click_post',
      status: 'issued',
      issuedAt: '2026-03-03T00:00:00.000Z',
    }));
    routeModule.setIssueShippingLabelUseCaseFactoryForTest(
      async () =>
        ({
          execute,
        }) as unknown as Awaited<ReturnType<typeof routeModule.createIssueShippingLabelUseCase>>,
    );

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

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      orderId: 'ORD-001',
      labelId: 'LBL-001',
    });
    expect(execute).toHaveBeenCalledWith({
      orderId: 'ORD-001',
      shippingMethod: 'click_post',
    });
  });

  it('OrderNotFoundError は 404 を返す', async () => {
    routeModule.setIssueShippingLabelUseCaseFactoryForTest(
      async () =>
        ({
          execute: vi.fn(async () => {
            throw new OrderNotFoundError('ORD-404');
          }),
        }) as unknown as Awaited<ReturnType<typeof routeModule.createIssueShippingLabelUseCase>>,
    );

    const request = new NextRequest('http://localhost/api/orders/ORD-404/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shippingMethod: 'click_post' }),
    });
    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-404' }),
    });

    expect(response.status).toBe(404);
  });

  it('InvalidLabelIssueInputError は 400 を返す', async () => {
    routeModule.setIssueShippingLabelUseCaseFactoryForTest(
      async () =>
        ({
          execute: vi.fn(async () => {
            throw new InvalidLabelIssueInputError('配送方法が不正です');
          }),
        }) as unknown as Awaited<ReturnType<typeof routeModule.createIssueShippingLabelUseCase>>,
    );

    const request = new NextRequest('http://localhost/api/orders/ORD-001/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shippingMethod: 'click_post' }),
    });
    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(400);
  });

  it('InvalidLabelIssueOperationError は 400 を返す', async () => {
    routeModule.setIssueShippingLabelUseCaseFactoryForTest(
      async () =>
        ({
          execute: vi.fn(async () => {
            throw new InvalidLabelIssueOperationError('発送済み注文には伝票を発行できません');
          }),
        }) as unknown as Awaited<ReturnType<typeof routeModule.createIssueShippingLabelUseCase>>,
    );

    const request = new NextRequest('http://localhost/api/orders/ORD-001/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shippingMethod: 'click_post' }),
    });
    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(400);
  });

  it('ExternalServiceError は 503 を返す', async () => {
    routeModule.setIssueShippingLabelUseCaseFactoryForTest(async () => {
      throw new ExternalServiceError('CLICKPOST_EMAIL / CLICKPOST_PASSWORD が設定されていません');
    });

    const request = new NextRequest('http://localhost/api/orders/ORD-001/labels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shippingMethod: 'click_post' }),
    });
    const response = await routeModule.POST(request, {
      params: Promise.resolve({ orderId: 'ORD-001' }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: 'CLICKPOST_EMAIL / CLICKPOST_PASSWORD が設定されていません',
      },
    });
  });
});

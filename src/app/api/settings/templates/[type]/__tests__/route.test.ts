import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getTemplateMock, updateTemplateMock } = vi.hoisted(() => ({
  getTemplateMock: vi.fn(),
  updateTemplateMock: vi.fn(),
}));

vi.mock('@/infrastructure/di/container', () => ({
  createContainer: vi.fn(() => ({
    getUpdateMessageTemplateUseCase: () => ({
      getTemplate: getTemplateMock,
      updateTemplate: updateTemplateMock,
    }),
  })),
}));

import { GET, PUT } from '../route';

const DEFAULT_TEMPLATE = {
  id: 'default-purchase-thanks',
  type: 'purchase_thanks',
  content: '{{buyer_name}} 様\nありがとうございます。',
  variables: ['buyer_name'],
};

describe('GET /api/settings/templates/[type]', () => {
  beforeEach(() => {
    getTemplateMock.mockReset();
    updateTemplateMock.mockReset();
  });

  it('テンプレートを返す', async () => {
    getTemplateMock.mockResolvedValueOnce(DEFAULT_TEMPLATE);

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ type: 'purchase_thanks' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(DEFAULT_TEMPLATE);
    expect(getTemplateMock).toHaveBeenCalledWith('purchase_thanks');
  });

  it('不明な type は 400 を返す', async () => {
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ type: 'unknown_type' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});

describe('PUT /api/settings/templates/[type]', () => {
  beforeEach(() => {
    getTemplateMock.mockReset();
    updateTemplateMock.mockReset();
  });

  it('テンプレートを保存して返す', async () => {
    const saved = { ...DEFAULT_TEMPLATE, content: '{{buyer_name}} 様\n新しいテンプレート' };
    updateTemplateMock.mockResolvedValueOnce(saved);

    const request = new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '{{buyer_name}} 様\n新しいテンプレート' }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ type: 'purchase_thanks' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(saved);
    expect(updateTemplateMock).toHaveBeenCalledWith({
      type: 'purchase_thanks',
      content: '{{buyer_name}} 様\n新しいテンプレート',
    });
  });

  it('content が空の場合は 400 を返す', async () => {
    const request = new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ type: 'purchase_thanks' }),
    });

    expect(response.status).toBe(400);
  });

  it('変数なしエラーは 400 を返す', async () => {
    updateTemplateMock.mockRejectedValueOnce(
      new Error('テンプレートには最低1つの変数を含めてください'),
    );

    const request = new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '変数なし本文' }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ type: 'purchase_thanks' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: 'テンプレートには最低1つの変数を含めてください' },
    });
  });

  it('不明な type は 400 を返す', async () => {
    const request = new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '{{buyer_name}} テスト' }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ type: 'unknown_type' }),
    });

    expect(response.status).toBe(400);
  });
});

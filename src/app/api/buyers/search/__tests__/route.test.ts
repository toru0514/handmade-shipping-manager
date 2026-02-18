import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

describe('GET /api/buyers/search', () => {
  it('name が空の場合は空配列を返す', async () => {
    const request = new NextRequest('http://localhost/api/buyers/search?name=');
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it('name パラメータが未指定の場合も空配列を返す', async () => {
    const request = new NextRequest('http://localhost/api/buyers/search');
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });
});

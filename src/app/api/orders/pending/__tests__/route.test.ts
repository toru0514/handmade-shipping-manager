import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationError, ExternalServiceError } from '@/infrastructure/errors/HttpErrors';

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/usecases/ListPendingOrdersUseCase', () => ({
  ListPendingOrdersUseCase: class {
    execute = executeMock;
  },
}));

vi.mock('@/domain/specifications/OverdueOrderSpecification', () => ({
  OverdueOrderSpecification: class {},
}));

vi.mock('@/infrastructure/adapters/persistence/SpreadsheetOrderRepository', () => ({
  SpreadsheetOrderRepository: class {},
}));

vi.mock('@/infrastructure/external/google/SheetsClient', () => ({
  GoogleSheetsClient: class {},
}));

import { GET } from '../route';

describe('GET /api/orders/pending', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it('正常時は注文一覧を返す', async () => {
    executeMock.mockResolvedValueOnce([{ orderId: 'ORD-001' }]);

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ orderId: 'ORD-001' }]);
  });

  it('認証エラー時は 401 と統一フォーマットを返す', async () => {
    executeMock.mockRejectedValueOnce(new AuthenticationError('認証に失敗しました'));

    const response = await GET();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: '認証に失敗しました',
      },
    });
  });

  it('外部サービスエラー時は 503 と統一フォーマットを返す', async () => {
    executeMock.mockRejectedValueOnce(new ExternalServiceError('一時的に利用できません'));

    const response = await GET();
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

    const response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '注文の取得に失敗しました',
      },
    });
  });
});

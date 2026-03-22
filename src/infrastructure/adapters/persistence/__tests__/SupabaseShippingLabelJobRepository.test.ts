import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseShippingLabelJobRepository } from '../SupabaseShippingLabelJobRepository';

function createMockSupabase() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  return {
    from: vi.fn().mockReturnValue(chainable),
    _chain: chainable,
  };
}

const JOB_ROW = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  order_id: 'ORD-001',
  shipping_method: 'click_post',
  status: 'pending',
  result: null,
  error: null,
  created_at: '2026-03-22T00:00:00.000Z',
  updated_at: '2026-03-22T00:00:00.000Z',
  completed_at: null,
};

describe('SupabaseShippingLabelJobRepository', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let repository: SupabaseShippingLabelJobRepository;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new SupabaseShippingLabelJobRepository(mockSupabase as any);
  });

  describe('enqueue', () => {
    it('ジョブを登録して返す', async () => {
      mockSupabase._chain.single.mockResolvedValue({ data: JOB_ROW, error: null });

      const job = await repository.enqueue({
        orderId: 'ORD-001',
        shippingMethod: 'click_post',
      });

      expect(job.id).toBe(JOB_ROW.id);
      expect(job.orderId).toBe('ORD-001');
      expect(job.shippingMethod).toBe('click_post');
      expect(job.status).toBe('pending');
      expect(mockSupabase.from).toHaveBeenCalledWith('shipping_label_jobs');
    });

    it('Supabaseエラー時に例外を投げる', async () => {
      mockSupabase._chain.single.mockResolvedValue({
        data: null,
        error: { message: 'insert error' },
      });

      await expect(
        repository.enqueue({ orderId: 'ORD-001', shippingMethod: 'click_post' }),
      ).rejects.toThrow('ジョブの登録に失敗しました');
    });
  });

  describe('findById', () => {
    it('存在するジョブを返す', async () => {
      mockSupabase._chain.single.mockResolvedValue({ data: JOB_ROW, error: null });

      const job = await repository.findById(JOB_ROW.id);

      expect(job).not.toBeNull();
      expect(job!.id).toBe(JOB_ROW.id);
    });

    it('存在しない場合はnullを返す', async () => {
      mockSupabase._chain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      });

      const job = await repository.findById('nonexistent');

      expect(job).toBeNull();
    });
  });

  describe('findPendingJobs', () => {
    it('pending ジョブを created_at 昇順で返す', async () => {
      mockSupabase._chain.limit.mockResolvedValue({ data: [JOB_ROW], error: null });

      const jobs = await repository.findPendingJobs();

      expect(jobs).toHaveLength(1);
      expect(jobs[0].status).toBe('pending');
      expect(mockSupabase._chain.eq).toHaveBeenCalledWith('status', 'pending');
      expect(mockSupabase._chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });
  });

  describe('markAsProcessing', () => {
    it('pending → processing に更新できる場合 true を返す', async () => {
      mockSupabase._chain.select.mockResolvedValue({ data: [JOB_ROW], error: null });

      const result = await repository.markAsProcessing(JOB_ROW.id);

      expect(result).toBe(true);
    });

    it('既に processing の場合 false を返す（楽観ロック）', async () => {
      mockSupabase._chain.select.mockResolvedValue({ data: [], error: null });

      const result = await repository.markAsProcessing(JOB_ROW.id);

      expect(result).toBe(false);
    });
  });

  describe('markAsCompleted', () => {
    it('結果を保存してステータスを completed に更新する', async () => {
      mockSupabase._chain.eq.mockResolvedValue({ error: null });

      await repository.markAsCompleted(JOB_ROW.id, { labelId: 'LBL-001' });

      expect(mockSupabase._chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          result: { labelId: 'LBL-001' },
        }),
      );
    });
  });

  describe('markAsFailed', () => {
    it('エラーメッセージを保存してステータスを failed に更新する', async () => {
      mockSupabase._chain.eq.mockResolvedValue({ error: null });

      await repository.markAsFailed(JOB_ROW.id, 'timeout error');

      expect(mockSupabase._chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'timeout error',
        }),
      );
    });
  });
});

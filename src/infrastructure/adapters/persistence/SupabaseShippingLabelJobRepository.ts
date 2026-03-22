import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ShippingLabelJob,
  ShippingLabelJobRepository,
  ShippingLabelJobStatus,
} from '@/domain/ports/ShippingLabelJobRepository';

interface JobRow {
  id: string;
  order_id: string;
  shipping_method: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function toJob(row: JobRow): ShippingLabelJob {
  return {
    id: row.id,
    orderId: row.order_id,
    shippingMethod: row.shipping_method,
    status: row.status as ShippingLabelJobStatus,
    result: row.result ?? undefined,
    error: row.error ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  };
}

export class SupabaseShippingLabelJobRepository implements ShippingLabelJobRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async enqueue(input: { orderId: string; shippingMethod: string }): Promise<ShippingLabelJob> {
    const { data, error } = await this.supabase
      .from('shipping_label_jobs')
      .insert({
        order_id: input.orderId,
        shipping_method: input.shippingMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`ジョブの登録に失敗しました: ${error?.message ?? 'データなし'}`);
    }

    return toJob(data as JobRow);
  }

  async findById(id: string): Promise<ShippingLabelJob | null> {
    const { data, error } = await this.supabase
      .from('shipping_label_jobs')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`ジョブの取得に失敗しました: ${error.message}`);
    }

    return data ? toJob(data as JobRow) : null;
  }

  async findPendingJobs(limit = 10): Promise<ShippingLabelJob[]> {
    const { data, error } = await this.supabase
      .from('shipping_label_jobs')
      .select()
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`pending ジョブの取得に失敗しました: ${error.message}`);
    }

    return (data as JobRow[]).map(toJob);
  }

  async markAsProcessing(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('shipping_label_jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select();

    if (error) {
      throw new Error(`ジョブのステータス更新に失敗しました: ${error.message}`);
    }

    return (data as JobRow[]).length > 0;
  }

  async markAsCompleted(id: string, result: Record<string, unknown>): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('shipping_label_jobs')
      .update({
        status: 'completed',
        result,
        updated_at: now,
        completed_at: now,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`ジョブの完了更新に失敗しました: ${error.message}`);
    }
  }

  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('shipping_label_jobs')
      .update({
        status: 'failed',
        error: errorMessage,
        updated_at: now,
        completed_at: now,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`ジョブの失敗更新に失敗しました: ${error.message}`);
    }
  }
}

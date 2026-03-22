-- 伝票発行ジョブキューテーブル
CREATE TABLE IF NOT EXISTS shipping_label_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  shipping_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shipping_label_jobs_status
  ON shipping_label_jobs(status);

CREATE INDEX IF NOT EXISTS idx_shipping_label_jobs_order_id
  ON shipping_label_jobs(order_id);

-- ============================================================
-- Handmade Sync Hub - Supabase 初期スキーマ
-- ============================================================

-- 管理者ユーザー（別アプリと共用可能なシンプル設計）
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 商品バックアップ
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  price INTEGER,
  inventory INTEGER,
  tags TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  sync_status TEXT,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  raw_data JSONB DEFAULT '{}',
  platform_snapshots JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 木材バックアップ
CREATE TABLE IF NOT EXISTS wood_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  features TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 同期ログ
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT,
  status TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_products_sync_status ON products (sync_status);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products (updated_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON sync_logs (entity_type, entity_id);

-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trigger_wood_materials_updated_at
  BEFORE UPDATE ON wood_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

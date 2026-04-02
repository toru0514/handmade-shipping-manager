-- ============================================================
-- RLS（Row-Level Security）を全テーブルに有効化
--
-- これらのテーブルは service role key（サーバーサイド）経由でのみ
-- アクセスされるため、anon key からのアクセスを完全にブロックする。
-- service role は RLS をバイパスするため、既存の動作に影響なし。
-- ============================================================

-- 002_product_tables.sql のテーブル
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wood_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- 001_create_tables.sql のテーブル（将来作成時に適用）
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shipping_labels ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 商品名マッピングテーブル（ProductNameMap のDBバックアップ）
-- スプシの ProductNameMap シートと同じデータを保持する。
-- ============================================================
CREATE TABLE IF NOT EXISTS product_name_map (
  original_product_name TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_name_map ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER trigger_product_name_map_updated_at
  BEFORE UPDATE ON product_name_map
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

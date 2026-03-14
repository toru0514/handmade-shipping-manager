-- orders テーブル
CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_postal_code TEXT,
  buyer_prefecture TEXT,
  buyer_city TEXT,
  buyer_street TEXT,
  buyer_building TEXT,
  buyer_phone TEXT,
  product_name TEXT NOT NULL,
  product_price INTEGER NOT NULL DEFAULT 0,
  products_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  ordered_at TIMESTAMPTZ NOT NULL,
  shipped_at TIMESTAMPTZ,
  shipping_method TEXT,
  tracking_number TEXT,
  click_post_item_name TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- shipping_labels テーブル
CREATE TABLE IF NOT EXISTS shipping_labels (
  label_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued',
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  click_post_pdf_data TEXT,
  click_post_tracking_number TEXT,
  yamato_qr_code TEXT,
  yamato_waybill_number TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- message_templates テーブル
CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

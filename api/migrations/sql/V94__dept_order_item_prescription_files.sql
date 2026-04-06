CREATE TABLE IF NOT EXISTS order_item_files (
  id BIGSERIAL PRIMARY KEY,
  order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_order_item_files_order_item_id
  ON order_item_files(order_item_id);

CREATE INDEX IF NOT EXISTS ix_order_item_files_file_type
  ON order_item_files(file_type);

ALTER TABLE order_item_processes
  ADD COLUMN IF NOT EXISTS product_id integer,
  ADD COLUMN IF NOT EXISTS product_code text,
  ADD COLUMN IF NOT EXISTS product_name text;

ALTER TABLE order_item_process_in_progresses
  ADD COLUMN IF NOT EXISTS product_id integer,
  ADD COLUMN IF NOT EXISTS product_code text,
  ADD COLUMN IF NOT EXISTS product_name text;

ALTER TABLE order_item_processes
  ADD COLUMN IF NOT EXISTS product_code_norm text GENERATED ALWAYS AS (lower(unaccent_immutable(product_code))) STORED,
  ADD COLUMN IF NOT EXISTS product_name_norm text GENERATED ALWAYS AS (lower(unaccent_immutable(product_name))) STORED;

CREATE INDEX IF NOT EXISTS idx_order_item_processes_order_item_product_step
  ON order_item_processes(order_item_id, product_id, step_number);

CREATE INDEX IF NOT EXISTS idx_order_item_processes_product_step
  ON order_item_processes(product_id, step_number);

CREATE INDEX IF NOT EXISTS idx_order_item_processes_product_code_trgm_norm
  ON order_item_processes USING gin (product_code_norm gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_order_item_processes_product_name_trgm_norm
  ON order_item_processes USING gin (product_name_norm gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_oipip_order_item_product_created_at
  ON order_item_process_in_progresses(order_item_id, product_id, created_at DESC);

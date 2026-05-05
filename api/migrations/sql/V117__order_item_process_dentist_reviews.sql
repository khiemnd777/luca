CREATE TABLE IF NOT EXISTS order_item_process_dentist_reviews (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NULL,
  order_item_id BIGINT NOT NULL,
  order_item_code TEXT NULL,
  product_id INT NULL,
  product_code TEXT NULL,
  product_name TEXT NULL,
  process_id BIGINT NULL,
  process_name TEXT NULL,
  in_progress_id BIGINT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_note TEXT NOT NULL,
  response_note TEXT NULL,
  requested_by INT NULL,
  resolved_by INT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_item_process_dentist_reviews_order_items_dentist_reviews
    FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  CONSTRAINT order_item_process_dentist_reviews_order_item_processes_dentist_reviews
    FOREIGN KEY (process_id) REFERENCES order_item_processes(id) ON DELETE SET NULL,
  CONSTRAINT order_item_process_dentist_reviews_order_item_process_in_progresses_dentist_reviews
    FOREIGN KEY (in_progress_id) REFERENCES order_item_process_in_progresses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_item_process_dentist_reviews_order_status
  ON order_item_process_dentist_reviews (order_id, status);

CREATE INDEX IF NOT EXISTS idx_order_item_process_dentist_reviews_item_status
  ON order_item_process_dentist_reviews (order_item_id, status);

CREATE INDEX IF NOT EXISTS idx_order_item_process_dentist_reviews_item_product_status
  ON order_item_process_dentist_reviews (order_item_id, product_id, status);

CREATE INDEX IF NOT EXISTS idx_order_item_process_dentist_reviews_process_status
  ON order_item_process_dentist_reviews (process_id, status);

CREATE INDEX IF NOT EXISTS idx_order_item_process_dentist_reviews_in_progress
  ON order_item_process_dentist_reviews (in_progress_id);

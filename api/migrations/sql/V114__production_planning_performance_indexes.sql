CREATE INDEX IF NOT EXISTS idx_oipip_planning_active_order_item_started
  ON order_item_process_in_progresses(order_item_id, started_at DESC, created_at DESC)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_oip_planning_remaining_order_item
  ON order_item_processes(order_item_id)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_planning_active_department_delivery
  ON orders(department_id, delivery_date)
  WHERE deleted_at IS NULL
    AND COALESCE(NULLIF(status_latest, ''), 'received') NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_order_items_planning_active_order
  ON order_items(order_id, id)
  WHERE deleted_at IS NULL
    AND COALESCE(NULLIF(status, ''), 'received') NOT IN ('completed', 'cancelled');

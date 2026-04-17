CREATE INDEX IF NOT EXISTS idx_oim_loaner_material_order_item
  ON order_item_materials (material_id, order_id, order_item_id)
  WHERE type = 'loaner'
    AND is_cloneable IS NULL;

CREATE INDEX IF NOT EXISTS idx_oim_loaner_order_material
  ON order_item_materials (order_id, material_id)
  WHERE type = 'loaner'
    AND is_cloneable IS NULL;

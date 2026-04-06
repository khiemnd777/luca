-- Reset and reseed order-related metadata collections/fields.
-- Scope:
--   - order
--   - order-item
--   - order-item-product
--   - order-item-process
--   - order-item-remake
--   - order-item-tooth
--
-- Notes:
--   - Deleting collections will cascade delete their fields via fields.collection_id FK.
--   - This migration supersedes earlier lightweight seeds in V50/V55.

DELETE FROM collections
WHERE slug IN (
  'order',
  'order-item',
  'order-item-product',
  'order-item-process',
  'order-item-remake',
  'order-item-tooth'
);

INSERT INTO collections (slug, name, show_if, integration, "group")
VALUES
  ('order', 'Đơn hàng', NULL, FALSE, NULL),
  ('order-item', 'Đơn hàng phụ', NULL, FALSE, NULL),
  ('order-item-product', 'Đơn hàng (Sản phẩm)', NULL, FALSE, NULL),
  ('order-item-process', 'Đơn hàng (Công đoạn)', NULL, FALSE, NULL),
  (
    'order-item-remake',
    'Đơn hàng (Làm lại)',
    '{"field":"latestOrderItem.remakeCount","op":"gt","value":0}'::jsonb,
    FALSE,
    NULL
  ),
  (
    'order-item-tooth',
    'Đơn hàng (Sản phẩm - Răng)',
    '{"all":[{"field":"latestOrderItem.customFields.productCategory","op":"neq","value":null},{"field":"latestOrderItem.customFields.productCategory","op":"neq","value":"denture"}]}'::jsonb,
    FALSE,
    NULL
  );

WITH seed_fields (
  collection_slug,
  name,
  label,
  type,
  required,
  "unique",
  default_value,
  options,
  order_index,
  visibility,
  relation,
  "table",
  form,
  search,
  tag
) AS (
  VALUES
    -- order
    ('order', 'clinic_id', 'Nha khoa', 'relation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 1, 'public', '{"target":"orders_clinics","type":"1","form":"clinic","placeholder":"Tìm nha khoa..."}'::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order', 'clinic_name', 'Nha khoa (Ghost)', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 2, 'hidden', NULL::jsonb, FALSE, FALSE, FALSE, NULL),
    ('order', 'dentist_id', 'Nha sĩ', 'relation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 3, 'public', '{"target":"orders_dentists","type":"1","form":"dentist","placeholder":"Tìm nha sĩ..."}'::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order', 'dentist_name', 'Nha sĩ (Ghost)', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 4, 'hidden', NULL::jsonb, FALSE, FALSE, FALSE, NULL),
    ('order', 'patient_id', 'Bệnh nhân', 'relation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 5, 'public', '{"target":"orders_patients","type":"1","form":"patient","placeholder":"Tìm bệnh nhân..."}'::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order', 'patient_name', 'Bệnh nhân (Ghost)', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 6, 'hidden', NULL::jsonb, FALSE, FALSE, FALSE, NULL),
    ('order', 'ref_user_id', 'Nhân viên', 'relation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 7, 'public', '{"target":"orders_ref_users","type":"1","placeholder":"Tìm nhân viên..."}'::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order', 'ref_user_name', 'Nhân viên (Ghost)', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 8, 'hidden', NULL::jsonb, FALSE, FALSE, FALSE, NULL),
    ('order', 'status', 'Trạng thái', 'select', FALSE, FALSE, NULL::jsonb, '[{"value":"received","label":"Đã nhận đơn"},{"value":"in_progress","label":"Đang gia công"},{"value":"qc","label":"Đang kiểm thử"},{"value":"completed","label":"Đã hoàn thành"},{"value":"rework","label":"Làm lại"}]'::jsonb, 9, 'hidden', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order', 'priority', 'Ưu tiên', 'select', FALSE, FALSE, NULL::jsonb, '[{"value":"normal","label":"Bình thường"},{"value":"high","label":"Cao"},{"value":"urgent","label":"Khẩn cấp"},{"value":"critical","label":"Tối khẩn"}]'::jsonb, 10, 'hidden', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order', 'note', 'Ghi chú tổng quát', 'textarea', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 11, 'hidden', NULL::jsonb, FALSE, TRUE, FALSE, NULL),

    -- order-item
    ('order-item', 'note', 'Ghi chú', 'textarea', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 2, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order-item', 'status', 'Trạng thái', 'select', FALSE, FALSE, NULL::jsonb, '[{"value":"received","label":"Đã nhận đơn"},{"value":"in_progress","label":"Đang gia công"},{"value":"completed","label":"Đã hoàn thành"}]'::jsonb, 3, 'public', NULL::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order-item', 'priority', 'Ưu tiên', 'select', FALSE, FALSE, NULL::jsonb, '[{"value":"normal","label":"Bình thường"},{"value":"high","label":"Cao"},{"value":"urgent","label":"Khẩn cấp"},{"value":"critical","label":"Tối khẩn"}]'::jsonb, 4, 'public', NULL::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order-item', 'quantity', 'Số lượng', 'number', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 5, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order-item', 'retail_price', 'Giá bán lẻ', 'currency', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 6, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order-item', 'vat', 'VAT', 'number', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 7, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order-item', 'discount_price', 'Giảm giá', 'currency', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 8, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order-item', 'delivery_date', 'Ngày giao', 'datetime', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 9, 'public', NULL::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order-item', 'total_price', 'Thành tiền', 'currency_equation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 10, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),

    -- order-item-product
    ('order-item-product', 'product_id', 'Sản phẩm', 'relation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 1, 'public', '{"target":"orders_products","type":"1","form":"product","placeholder":"Tìm sản phẩm..."}'::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order-item-product', 'product_name', 'Sản phẩm (Ghost)', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 2, 'hidden', NULL::jsonb, FALSE, FALSE, FALSE, NULL),
    ('order-item-product', 'product_category', 'Danh mục', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 3, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),

    -- order-item-process
    ('order-item-process', 'status', 'Trạng thái', 'select', FALSE, FALSE, NULL::jsonb, '[{"value":"waiting","label":"Đang chờ"},{"value":"in_progress","label":"Đang gia công"},{"value":"qc","label":"Đang kiểm thử"},{"value":"completed","label":"Đã hoàn thành"},{"value":"rework","label":"Làm lại"}]'::jsonb, 1, 'public', NULL::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order-item-process', 'assigned_id', 'Kỹ thuật viên', 'relation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 2, 'public', '{"target":"orderitemprocess_assignee","form":"staff","type":"1","placeholder":"Tìm nhân sự..."}'::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order-item-process', 'assigned_name', 'Kỹ thuật viên (Ghost)', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 3, 'hidden', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order-item-process', 'note', 'Ghi chú', 'textarea', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 4, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),
    ('order-item-process', 'priority', 'Ưu tiên (Ghost)', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 5, 'hidden', NULL::jsonb, FALSE, FALSE, FALSE, NULL),

    -- order-item-remake
    ('order-item-remake', 'remake_type', 'Chỉnh sửa/Làm lại', 'select', FALSE, FALSE, NULL::jsonb, '[{"value":"adjust","label":"Chỉnh sửa"},{"value":"remake","label":"Làm lại"}]'::jsonb, 1, 'public', NULL::jsonb, TRUE, TRUE, FALSE, NULL),
    ('order-item-remake', 'remake_reason', 'Nguyên nhân?', 'textarea', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 2, 'public', NULL::jsonb, FALSE, TRUE, FALSE, NULL),

    -- order-item-tooth
    ('order-item-tooth', 'tooth_positions', 'Vị trí răng', 'text', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 1, 'public', NULL::jsonb, TRUE, TRUE, FALSE, NULL)
)
INSERT INTO fields (
  collection_id,
  name,
  label,
  type,
  required,
  "unique",
  default_value,
  options,
  order_index,
  visibility,
  relation,
  "table",
  form,
  search,
  tag
)
SELECT
  c.id,
  s.name,
  s.label,
  s.type,
  s.required,
  s."unique",
  s.default_value,
  s.options,
  s.order_index,
  s.visibility,
  s.relation,
  s."table",
  s.form,
  s.search,
  s.tag
FROM seed_fields s
JOIN collections c
  ON c.slug = s.collection_slug;

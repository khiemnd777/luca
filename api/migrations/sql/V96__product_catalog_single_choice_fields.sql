-- Align product catalog metadata so brand/material/technique/restoration-type
-- fields render as single-choice refs while process remains multi-choice.

WITH tmp_v96_catalog_fields AS (
  SELECT *
  FROM (
    VALUES
      ('Cố Định', 'brand_name_ids', 'Thương hiệu', 1, 'products_brand_names', 'brand_name', 'Tìm thương hiệu phù hợp...'),
      ('Tháo Lắp', 'raw_material_ids', 'Vật liệu', 1, 'products_raw_materials', 'raw_material', 'Tìm vật liệu phù hợp...'),
      ('Tháo Lắp', 'brand_name_ids', 'Thương hiệu', 2, 'products_brand_names', 'brand_name', 'Tìm thương hiệu phù hợp...'),
      ('Implant', 'raw_material_ids', 'Vật liệu', 1, 'products_raw_materials', 'raw_material', 'Tìm vật liệu phù hợp...'),
      ('Implant', 'brand_name_ids', 'Thương hiệu', 2, 'products_brand_names', 'brand_name', 'Tìm thương hiệu phù hợp...'),
      ('Implant', 'technique_ids', 'Công nghệ', 3, 'products_techniques', 'technique', 'Tìm công nghệ phù hợp...'),
      ('Implant', 'restoration_type_ids', 'Kiểu phục hình', 4, 'products_restoration_types', 'restoration_type', 'Tìm kiểu phục hình phù hợp...')
  ) AS seed(lv1_name, name, label, order_index, target, form_key, placeholder)
),
tmp_v96_lv1 AS (
  SELECT
    c.id,
    c.name
  FROM categories c
  WHERE c.department_id = 1
    AND c.level = 1
    AND c.deleted_at IS NULL
    AND c.name IN ('Cố Định', 'Tháo Lắp', 'Implant')
)
UPDATE fields f
SET label = seed.label,
    type = 'relation',
    order_index = seed.order_index,
    relation = jsonb_build_object(
      'target', seed.target,
      'form', seed.form_key,
      'where', jsonb_build_array(format('category_id=%s', lv1.id)),
      'type', '1',
      'placeholder', seed.placeholder
    ),
    tag = 'catalog'
FROM tmp_v96_lv1 lv1
JOIN collections c
  ON c.slug = 'category-' || lv1.id
 AND c.deleted_at IS NULL
JOIN tmp_v96_catalog_fields seed
  ON seed.lv1_name = lv1.name
WHERE f.collection_id = c.id
  AND f.name = seed.name;

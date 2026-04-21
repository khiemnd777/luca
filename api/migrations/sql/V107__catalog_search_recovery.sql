DELETE FROM search_index
WHERE entity_type = 'brand'
  AND NOT EXISTS (
    SELECT 1
    FROM brand_names b
    WHERE b.id = search_index.entity_id
      AND b.deleted_at IS NULL
  );

INSERT INTO search_index (
  entity_type,
  entity_id,
  title,
  subtitle,
  keywords,
  content,
  attributes,
  org_id,
  owner_id,
  acl_hash,
  updated_at
)
SELECT
  'brand_name',
  b.id,
  b.name,
  NULLIF(b.category_name, ''),
  NULLIF(concat_ws('|', b.name, b.category_name), ''),
  NULL,
  '{}'::jsonb,
  b.department_id::bigint,
  NULL,
  NULL,
  NOW()
FROM brand_names b
WHERE b.deleted_at IS NULL
ON CONFLICT (entity_type, entity_id) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    keywords = EXCLUDED.keywords,
    content = EXCLUDED.content,
    attributes = EXCLUDED.attributes,
    org_id = EXCLUDED.org_id,
    owner_id = EXCLUDED.owner_id,
    acl_hash = EXCLUDED.acl_hash,
    updated_at = NOW();

DELETE FROM search_index
WHERE entity_type = 'brand';

INSERT INTO search_index (
  entity_type,
  entity_id,
  title,
  subtitle,
  keywords,
  content,
  attributes,
  org_id,
  owner_id,
  acl_hash,
  updated_at
)
SELECT
  'category',
  c.id,
  c.name,
  NULLIF(concat_ws(' > ', c.category_name_lv1, c.category_name_lv2), ''),
  NULLIF(concat_ws('|', c.name, c.category_name_lv1, c.category_name_lv2, c.category_name_lv3), ''),
  NULL,
  '{}'::jsonb,
  c.department_id::bigint,
  NULL,
  NULL,
  NOW()
FROM categories c
WHERE c.deleted_at IS NULL
ON CONFLICT (entity_type, entity_id) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    keywords = EXCLUDED.keywords,
    content = EXCLUDED.content,
    attributes = EXCLUDED.attributes,
    org_id = EXCLUDED.org_id,
    owner_id = EXCLUDED.owner_id,
    acl_hash = EXCLUDED.acl_hash,
    updated_at = NOW();

INSERT INTO search_index (
  entity_type,
  entity_id,
  title,
  subtitle,
  keywords,
  content,
  attributes,
  org_id,
  owner_id,
  acl_hash,
  updated_at
)
SELECT
  'raw_material',
  rm.id,
  rm.name,
  NULLIF(rm.category_name, ''),
  NULLIF(concat_ws('|', rm.name, rm.category_name), ''),
  NULL,
  '{}'::jsonb,
  rm.department_id::bigint,
  NULL,
  NULL,
  NOW()
FROM raw_materials rm
WHERE rm.deleted_at IS NULL
ON CONFLICT (entity_type, entity_id) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    keywords = EXCLUDED.keywords,
    content = EXCLUDED.content,
    attributes = EXCLUDED.attributes,
    org_id = EXCLUDED.org_id,
    owner_id = EXCLUDED.owner_id,
    acl_hash = EXCLUDED.acl_hash,
    updated_at = NOW();

INSERT INTO search_index (
  entity_type,
  entity_id,
  title,
  subtitle,
  keywords,
  content,
  attributes,
  org_id,
  owner_id,
  acl_hash,
  updated_at
)
SELECT
  'technique',
  t.id,
  t.name,
  NULLIF(t.category_name, ''),
  NULLIF(concat_ws('|', t.name, t.category_name), ''),
  NULL,
  '{}'::jsonb,
  t.department_id::bigint,
  NULL,
  NULL,
  NOW()
FROM techniques t
WHERE t.deleted_at IS NULL
ON CONFLICT (entity_type, entity_id) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    keywords = EXCLUDED.keywords,
    content = EXCLUDED.content,
    attributes = EXCLUDED.attributes,
    org_id = EXCLUDED.org_id,
    owner_id = EXCLUDED.owner_id,
    acl_hash = EXCLUDED.acl_hash,
    updated_at = NOW();

INSERT INTO search_index (
  entity_type,
  entity_id,
  title,
  subtitle,
  keywords,
  content,
  attributes,
  org_id,
  owner_id,
  acl_hash,
  updated_at
)
SELECT
  'restoration_type',
  rt.id,
  rt.name,
  NULLIF(rt.category_name, ''),
  NULLIF(concat_ws('|', rt.name, rt.category_name), ''),
  NULL,
  '{}'::jsonb,
  rt.department_id::bigint,
  NULL,
  NULL,
  NOW()
FROM restoration_types rt
WHERE rt.deleted_at IS NULL
ON CONFLICT (entity_type, entity_id) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    keywords = EXCLUDED.keywords,
    content = EXCLUDED.content,
    attributes = EXCLUDED.attributes,
    org_id = EXCLUDED.org_id,
    owner_id = EXCLUDED.owner_id,
    acl_hash = EXCLUDED.acl_hash,
    updated_at = NOW();

INSERT INTO search_index (
  entity_type,
  entity_id,
  title,
  subtitle,
  keywords,
  content,
  attributes,
  org_id,
  owner_id,
  acl_hash,
  updated_at
)
SELECT
  'product',
  p.id,
  p.name,
  NULLIF(p.category_name, ''),
  NULLIF(concat_ws('|', p.code, p.name, p.category_name, brand_refs.names, raw_material_refs.names, technique_refs.names, restoration_refs.names, p.process_names), ''),
  NULL,
  '{}'::jsonb,
  p.department_id::bigint,
  NULL,
  NULL,
  NOW()
FROM products p
LEFT JOIN LATERAL (
  SELECT string_agg(DISTINCT b.name, '|' ORDER BY b.name) AS names
  FROM product_brand_names pbn
  JOIN brand_names b
    ON b.id = pbn.brand_name_id
   AND b.deleted_at IS NULL
  WHERE pbn.product_id = p.id
) brand_refs ON TRUE
LEFT JOIN LATERAL (
  SELECT string_agg(DISTINCT rm.name, '|' ORDER BY rm.name) AS names
  FROM product_raw_materials prm
  JOIN raw_materials rm
    ON rm.id = prm.raw_material_id
   AND rm.deleted_at IS NULL
  WHERE prm.product_id = p.id
) raw_material_refs ON TRUE
LEFT JOIN LATERAL (
  SELECT string_agg(DISTINCT t.name, '|' ORDER BY t.name) AS names
  FROM product_techniques pt
  JOIN techniques t
    ON t.id = pt.technique_id
   AND t.deleted_at IS NULL
  WHERE pt.product_id = p.id
) technique_refs ON TRUE
LEFT JOIN LATERAL (
  SELECT string_agg(DISTINCT rt.name, '|' ORDER BY rt.name) AS names
  FROM product_restoration_types prt
  JOIN restoration_types rt
    ON rt.id = prt.restoration_type_id
   AND rt.deleted_at IS NULL
  WHERE prt.product_id = p.id
) restoration_refs ON TRUE
WHERE p.deleted_at IS NULL
ON CONFLICT (entity_type, entity_id) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    keywords = EXCLUDED.keywords,
    content = EXCLUDED.content,
    attributes = EXCLUDED.attributes,
    org_id = EXCLUDED.org_id,
    owner_id = EXCLUDED.owner_id,
    acl_hash = EXCLUDED.acl_hash,
    updated_at = NOW();

INSERT INTO search_index (
  entity_type,
  entity_id,
  title,
  subtitle,
  keywords,
  content,
  attributes,
  org_id,
  owner_id,
  acl_hash,
  updated_at
)
SELECT
  'material',
  m.id,
  m.name,
  NULLIF(concat_ws(' | ', m.code, m.type, format('implant=%s', m.is_implant)), ''),
  NULLIF(concat_ws('|', m.code, m.name, m.type, CASE WHEN m.is_implant THEN 'implant' ELSE 'non-implant' END), ''),
  NULL,
  '{}'::jsonb,
  m.department_id::bigint,
  NULL,
  NULL,
  NOW()
FROM materials m
WHERE m.deleted_at IS NULL
ON CONFLICT (entity_type, entity_id) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    keywords = EXCLUDED.keywords,
    content = EXCLUDED.content,
    attributes = EXCLUDED.attributes,
    org_id = EXCLUDED.org_id,
    owner_id = EXCLUDED.owner_id,
    acl_hash = EXCLUDED.acl_hash,
    updated_at = NOW();

DELETE FROM search_index si
WHERE si.entity_type = 'category'
  AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.id = si.entity_id AND c.deleted_at IS NULL
  );

DELETE FROM search_index si
WHERE si.entity_type = 'brand_name'
  AND NOT EXISTS (
    SELECT 1 FROM brand_names b WHERE b.id = si.entity_id AND b.deleted_at IS NULL
  );

DELETE FROM search_index si
WHERE si.entity_type = 'raw_material'
  AND NOT EXISTS (
    SELECT 1 FROM raw_materials rm WHERE rm.id = si.entity_id AND rm.deleted_at IS NULL
  );

DELETE FROM search_index si
WHERE si.entity_type = 'technique'
  AND NOT EXISTS (
    SELECT 1 FROM techniques t WHERE t.id = si.entity_id AND t.deleted_at IS NULL
  );

DELETE FROM search_index si
WHERE si.entity_type = 'restoration_type'
  AND NOT EXISTS (
    SELECT 1 FROM restoration_types rt WHERE rt.id = si.entity_id AND rt.deleted_at IS NULL
  );

DELETE FROM search_index si
WHERE si.entity_type = 'product'
  AND NOT EXISTS (
    SELECT 1 FROM products p WHERE p.id = si.entity_id AND p.deleted_at IS NULL
  );

DELETE FROM search_index si
WHERE si.entity_type = 'material'
  AND NOT EXISTS (
    SELECT 1 FROM materials m WHERE m.id = si.entity_id AND m.deleted_at IS NULL
  );

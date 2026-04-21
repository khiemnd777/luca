CREATE UNIQUE INDEX IF NOT EXISTS restoration_types_category_name_uq
ON restoration_types (department_id, category_id, name)
WHERE deleted_at IS NULL;

INSERT INTO restoration_types (category_id, category_name, name, department_id, created_at, updated_at)
SELECT c.id, 'Implant', v.name, 1, NOW(), NOW()
FROM (VALUES
	('Implant', 'Cement'),
	('Implant', 'Cement Bắt Vít'),
	('Implant', 'Bắt Vít'),
	('Implant', 'Hàm Phủ')
) AS v(category_name, name)
JOIN categories c
	ON c.name = v.category_name
	AND c.deleted_at IS NULL
ON CONFLICT DO NOTHING;

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
WHERE rt.department_id = 1
  AND rt.deleted_at IS NULL
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

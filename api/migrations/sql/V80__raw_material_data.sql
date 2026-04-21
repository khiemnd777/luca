CREATE UNIQUE INDEX IF NOT EXISTS raw_materials_dept_category_name_uq
ON raw_materials (department_id, category_id, name)
WHERE deleted_at IS NULL;

INSERT INTO raw_materials (department_id, category_id, category_name, name, created_at, updated_at)
SELECT
	1,
	c.id,
	c.name,
	v.name,
	NOW(),
	NOW()
FROM (VALUES
	('Tháo Lắp', 'Kim Loại Ti'),
	('Tháo Lắp', 'Kim Loại Cr-Co'),
	('Tháo Lắp', 'Cường Lực'),
	('Tháo Lắp', 'Nhựa Thường'),
	('Tháo Lắp', 'Nhựa Dẻo'),
	('Implant', 'Kim Loại'),
	('Implant', 'Không Kim Loại'),
	('Implant', 'Cường Lực'),
	('Implant', 'Nhựa Thường'),
	('Implant', 'PMMA'),
	('Implant', 'Khung Sườn'),
	('Implant', 'Khung Titan'),
	('Implant', 'Khung Cùi Titan'),
	('Implant', 'Bar Kim Loại'),
	('Implant', 'Trụ Abutment'),
	('Implant', 'Zirconia')
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
WHERE rm.department_id = 1
  AND rm.deleted_at IS NULL
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

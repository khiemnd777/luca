-- Add columns for department scope and category cache
ALTER TABLE techniques
	ADD COLUMN IF NOT EXISTS department_id int DEFAULT 1;

ALTER TABLE techniques
	ADD COLUMN IF NOT EXISTS category_name text;

UPDATE techniques
SET department_id = 1
WHERE department_id IS NULL;

ALTER TABLE techniques
	ALTER COLUMN department_id SET DEFAULT 1;

-- Unique partial index to prevent duplicates per department/category
CREATE UNIQUE INDEX IF NOT EXISTS techniques_dept_category_name_uq
ON techniques (department_id, category_id, name)
WHERE deleted_at IS NULL;

-- Seed base techniques (additive only)
INSERT INTO techniques (department_id, category_id, category_name, name, created_at, updated_at)
SELECT
	1,
	c.id,
	c.name,
	v.name,
	NOW(),
	NOW()
FROM (VALUES
	('Implant', 'Đúc'),
	('Implant', 'In'),
	('Implant', 'Cad Cam'),
	('Implant', 'In 3D'),
	('Implant', 'Không Mill Kết Nối'),
	('Implant', 'Mill Kết Nối')
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
WHERE t.department_id = 1
  AND t.deleted_at IS NULL
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

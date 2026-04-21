DROP INDEX IF EXISTS material_code_deleted_at;

WITH seed_materials(name, is_implant) AS (
	VALUES
		('Khay lấy dấu', FALSE),
		('Hàm đối', FALSE),
		('Sáp cắn', FALSE),
		('Giá khớp', FALSE),
		('Mẫu răng', FALSE),
		('Cây lấy dấu', FALSE),
		('Analog', FALSE),
		('Ốc labo', FALSE),
		('Cây vận tính lực', FALSE),
		('Vít ngắn', FALSE),
		('Ốc lâm sàng', FALSE),
		('Nướu nhựa', FALSE),
		('Khoá chuyển', FALSE),
		('Cây lấy dấu', TRUE),
		('Analog', TRUE),
		('Ốc labo', TRUE),
		('Cây vận tính lực', TRUE),
		('Vít ngắn', TRUE),
		('Ốc lâm sàng', TRUE),
		('Nướu nhựa', TRUE),
		('Khoá chuyển', TRUE)
)
INSERT INTO materials (
	department_id,
	code,
	name,
	type,
	active,
	is_implant,
	custom_fields,
	created_at,
	updated_at
)
SELECT
	1,
	s.name,
	s.name,
	'loaner',
	TRUE,
	s.is_implant,
	'{}'::jsonb,
	NOW(),
	NOW()
FROM seed_materials s
WHERE NOT EXISTS (
	SELECT 1
	FROM materials m
	WHERE m.department_id = 1
	  AND m.deleted_at IS NULL
	  AND m.type = 'loaner'
	  AND m.is_implant = s.is_implant
	  AND m.code = s.name
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
WHERE m.department_id = 1
  AND m.deleted_at IS NULL
  AND m.type = 'loaner'
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

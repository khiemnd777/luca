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
FROM seed_materials s;

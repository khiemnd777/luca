WITH process_section_sources AS (
	SELECT
		pp.process_id,
		s.id AS section_id,
		s.name AS section_name,
		MIN(COALESCE(pp.display_order, 9999)) AS display_order
	FROM product_processes pp
	JOIN products pr
		ON pr.id = pp.product_id
	 AND pr.deleted_at IS NULL
	JOIN processes p
		ON p.id = pp.process_id
	 AND p.deleted_at IS NULL
	 AND p.department_id = pr.department_id
	JOIN categories c
		ON c.id = pr.category_id
	 AND c.deleted_at IS NULL
	LEFT JOIN categories lv1
		ON lv1.id = COALESCE(c.category_id_lv1, CASE WHEN c.level = 1 THEN c.id END)
	 AND lv1.deleted_at IS NULL
	JOIN sections s
		ON s.department_id = pr.department_id
	 AND s.deleted_at IS NULL
	 AND lower(unaccent_immutable(s.name)) = lower(unaccent_immutable(COALESCE(lv1.name, c.name)))
	GROUP BY
		pp.process_id,
		s.id,
		s.name
)
INSERT INTO section_processes (
	section_id,
	process_id,
	section_name,
	process_name,
	display_order,
	created_at
)
SELECT
	src.section_id,
	src.process_id,
	src.section_name,
	p.name,
	src.display_order,
	NOW()
FROM process_section_sources src
JOIN processes p ON p.id = src.process_id
ON CONFLICT (section_id, process_id)
DO UPDATE SET
	section_name = EXCLUDED.section_name,
	process_name = EXCLUDED.process_name,
	display_order = EXCLUDED.display_order;

WITH process_section_summary AS (
	SELECT
		sp.process_id,
		CASE WHEN COUNT(DISTINCT sp.section_id) = 1 THEN MIN(sp.section_id) END AS section_id,
		string_agg(DISTINCT sp.section_name, ', ' ORDER BY sp.section_name) AS section_name
	FROM section_processes sp
	GROUP BY sp.process_id
)
UPDATE processes p
SET section_id = s.section_id,
	section_name = s.section_name,
	updated_at = NOW()
FROM process_section_summary s
WHERE p.id = s.process_id
	AND (
		p.section_id IS DISTINCT FROM s.section_id
		OR p.section_name IS DISTINCT FROM s.section_name
	);

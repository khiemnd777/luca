WITH process_department_candidates AS (
	SELECT sp.process_id, s.department_id
	FROM section_processes sp
	JOIN sections s ON s.id = sp.section_id
	WHERE s.department_id IS NOT NULL

	UNION ALL

	SELECT pp.process_id, pr.department_id
	FROM product_processes pp
	JOIN products pr ON pr.id = pp.product_id
	WHERE pr.department_id IS NOT NULL

	UNION ALL

	SELECT cp.process_id, c.department_id
	FROM category_processes cp
	JOIN categories c ON c.id = cp.category_id
	WHERE c.department_id IS NOT NULL

	UNION ALL

	SELECT p.id AS process_id, s.department_id
	FROM processes p
	JOIN sections s ON s.id = p.section_id
	WHERE p.section_id IS NOT NULL
		AND s.department_id IS NOT NULL
),
process_department_resolution AS (
	SELECT process_id, MIN(department_id) AS department_id
	FROM process_department_candidates
	GROUP BY process_id
	HAVING COUNT(DISTINCT department_id) = 1
)
UPDATE processes p
SET department_id = r.department_id,
	updated_at = NOW()
FROM process_department_resolution r
WHERE p.id = r.process_id
	AND (p.department_id IS NULL OR p.department_id <> r.department_id);

WITH seed_processes(name, active, custom_fields) AS (
	VALUES
		('Đai mẫu', TRUE, '{}'::jsonb),
		('Sáp', TRUE, '{}'::jsonb),
		('Cadcam', TRUE, '{}'::jsonb),
		('Sườn', TRUE, '{}'::jsonb),
		('Sứ', TRUE, '{}'::jsonb),
		('Tháo lắp', TRUE, '{}'::jsonb),
		('Cố định', TRUE, '{}'::jsonb),
		('Implant', TRUE, '{}'::jsonb),
		('Tháo lắp implant', TRUE, '{}'::jsonb),
		('Admin', TRUE, '{}'::jsonb)
)
UPDATE processes p
SET name = s.name,
	active = s.active,
	custom_fields = COALESCE(p.custom_fields, s.custom_fields),
	updated_at = NOW()
FROM seed_processes s
WHERE p.department_id = 1
	AND p.deleted_at IS NULL
	AND p.name_norm = lower(unaccent_immutable(s.name));

WITH seed_processes(name, active, custom_fields) AS (
	VALUES
		('Đai mẫu', TRUE, '{}'::jsonb),
		('Sáp', TRUE, '{}'::jsonb),
		('Cadcam', TRUE, '{}'::jsonb),
		('Sườn', TRUE, '{}'::jsonb),
		('Sứ', TRUE, '{}'::jsonb),
		('Tháo lắp', TRUE, '{}'::jsonb),
		('Cố định', TRUE, '{}'::jsonb),
		('Implant', TRUE, '{}'::jsonb),
		('Tháo lắp implant', TRUE, '{}'::jsonb),
		('Admin', TRUE, '{}'::jsonb)
)
INSERT INTO processes (department_id, name, active, custom_fields, created_at, updated_at)
SELECT
	1,
	s.name,
	s.active,
	s.custom_fields,
	NOW(),
	NOW()
FROM seed_processes s
WHERE NOT EXISTS (
	SELECT 1
	FROM processes p
	WHERE p.department_id = 1
		AND p.deleted_at IS NULL
		AND p.name_norm = lower(unaccent_immutable(s.name))
);

DO $$
DECLARE
	ambiguous_processes TEXT;
	unresolved_processes TEXT;
BEGIN
	WITH process_department_candidates AS (
		SELECT sp.process_id, s.department_id
		FROM section_processes sp
		JOIN sections s ON s.id = sp.section_id
		WHERE s.department_id IS NOT NULL

		UNION ALL

		SELECT pp.process_id, pr.department_id
		FROM product_processes pp
		JOIN products pr ON pr.id = pp.product_id
		WHERE pr.department_id IS NOT NULL

		UNION ALL

		SELECT cp.process_id, c.department_id
		FROM category_processes cp
		JOIN categories c ON c.id = cp.category_id
		WHERE c.department_id IS NOT NULL

		UNION ALL

		SELECT p.id AS process_id, s.department_id
		FROM processes p
		JOIN sections s ON s.id = p.section_id
		WHERE p.section_id IS NOT NULL
			AND s.department_id IS NOT NULL
	),
	process_department_counts AS (
		SELECT process_id, COUNT(DISTINCT department_id) AS department_count
		FROM process_department_candidates
		GROUP BY process_id
	)
	SELECT string_agg(process_id::TEXT, ', ' ORDER BY process_id)
	INTO ambiguous_processes
	FROM process_department_counts
	WHERE department_count > 1;

	IF ambiguous_processes IS NOT NULL THEN
		RAISE EXCEPTION 'V97 ambiguous process department ownership for process ids: %', ambiguous_processes;
	END IF;

	SELECT string_agg(id::TEXT, ', ' ORDER BY id)
	INTO unresolved_processes
	FROM processes
	WHERE department_id IS NULL;

	IF unresolved_processes IS NOT NULL THEN
		RAISE EXCEPTION 'V97 unresolved process department ownership for process ids: %', unresolved_processes;
	END IF;
END $$;

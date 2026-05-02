DO $$
BEGIN
IF EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'departments'
    AND column_name = 'administrator_id'
) THEN
INSERT INTO staffs (user_staff, department_id, section_names, custom_fields, created_at, updated_at)
SELECT
  d.administrator_id,
  d.id,
  NULL,
  '{}'::jsonb,
  NOW(),
  NOW()
FROM departments d
JOIN users u
  ON u.id = d.administrator_id
LEFT JOIN staffs s
  ON s.user_staff = d.administrator_id
WHERE d.deleted = FALSE
  AND d.administrator_id IS NOT NULL
  AND s.id IS NULL;

UPDATE staffs s
SET department_id = d.id,
    updated_at = NOW()
FROM departments d
JOIN users u
  ON u.id = d.administrator_id
WHERE d.deleted = FALSE
  AND d.administrator_id IS NOT NULL
  AND s.user_staff = d.administrator_id
  AND s.department_id IS DISTINCT FROM d.id;

INSERT INTO department_members (user_id, department_id, created_at)
SELECT
  d.administrator_id,
  d.id,
  NOW()
FROM departments d
JOIN users u
  ON u.id = d.administrator_id
WHERE d.deleted = FALSE
  AND d.administrator_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM department_members dm
    WHERE dm.user_id = d.administrator_id
      AND dm.department_id = d.id
  );
END IF;
END $$;

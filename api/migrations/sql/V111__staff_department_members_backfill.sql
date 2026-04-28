INSERT INTO department_members (user_id, department_id, created_at)
SELECT
  s.user_staff,
  s.department_id,
  NOW()
FROM staffs s
JOIN users u
  ON u.id = s.user_staff
JOIN departments d
  ON d.id = s.department_id
WHERE s.department_id IS NOT NULL
  AND u.deleted_at IS NULL
  AND d.deleted = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM department_members dm
    WHERE dm.user_id = s.user_staff
      AND dm.department_id = s.department_id
  );

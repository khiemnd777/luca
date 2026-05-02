ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS corporate_administrator_id INT;

INSERT INTO roles (role_name, display_name, brief)
VALUES ('corporate_admin', 'Corporate Administrator', 'Corporate department administrator')
ON CONFLICT (role_name)
DO UPDATE SET
  display_name = COALESCE(roles.display_name, EXCLUDED.display_name),
  brief = COALESCE(roles.brief, EXCLUDED.brief);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'departments'
      AND column_name = 'administrator_id'
  ) THEN
    UPDATE departments
    SET corporate_administrator_id = administrator_id
    WHERE corporate_administrator_id IS NULL
      AND administrator_id IS NOT NULL;

    ALTER TABLE departments
      DROP COLUMN administrator_id;
  END IF;
END $$;

WITH migrated_corporate_admins AS (
  SELECT DISTINCT corporate_administrator_id AS user_id
  FROM departments
  WHERE corporate_administrator_id IS NOT NULL
),
corporate_role AS (
  SELECT id
  FROM roles
  WHERE role_name = 'corporate_admin'
)
INSERT INTO user_roles (user_id, role_id)
SELECT m.user_id, r.id
FROM migrated_corporate_admins m
CROSS JOIN corporate_role r
ON CONFLICT DO NOTHING;

WITH migrated_corporate_admins AS (
  SELECT DISTINCT corporate_administrator_id AS user_id
  FROM departments
  WHERE corporate_administrator_id IS NOT NULL
),
admin_role AS (
  SELECT id
  FROM roles
  WHERE role_name = 'admin'
),
protected_system_admins AS (
  SELECT id AS user_id
  FROM users
  WHERE lower(email) = 'khiemnd777@gmail.com'
)
DELETE FROM user_roles ur
USING migrated_corporate_admins m, admin_role r
WHERE ur.user_id = m.user_id
  AND ur.role_id = r.id
  AND NOT EXISTS (
    SELECT 1
    FROM protected_system_admins p
    WHERE p.user_id = ur.user_id
  );

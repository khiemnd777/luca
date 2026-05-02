ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS corporate_administrator_id INT;

INSERT INTO roles (role_name, display_name, brief)
VALUES ('corporate_admin', 'Quản trị chi nhánh', 'Corporate department administrator')
ON CONFLICT (role_name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
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
    ALTER TABLE departments
      DROP COLUMN administrator_id;
  END IF;
END $$;

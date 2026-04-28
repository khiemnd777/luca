ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_phone_key;

DROP INDEX IF EXISTS users_phone_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_active_key
  ON users (phone)
  WHERE deleted_at IS NULL;

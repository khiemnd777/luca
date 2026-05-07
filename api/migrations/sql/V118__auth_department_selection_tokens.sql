CREATE TABLE IF NOT EXISTS auth_department_selection_tokens (
  jti TEXT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_department_selection_tokens_user_active
  ON auth_department_selection_tokens (user_id, expires_at)
  WHERE consumed_at IS NULL;

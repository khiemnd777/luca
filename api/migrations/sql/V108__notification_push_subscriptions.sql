CREATE TABLE IF NOT EXISTS device_push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  device_label TEXT NULL,
  user_agent TEXT NULL,
  install_mode TEXT NOT NULL DEFAULT 'browser',
  permission_state TEXT NOT NULL DEFAULT 'default',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ NULL,
  last_error_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  disabled_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_push_subscriptions_user_id
  ON device_push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_device_push_subscriptions_user_active
  ON device_push_subscriptions (user_id, disabled_at, revoked_at);

CREATE INDEX IF NOT EXISTS idx_device_push_subscriptions_user_updated_at
  ON device_push_subscriptions (user_id, updated_at DESC);

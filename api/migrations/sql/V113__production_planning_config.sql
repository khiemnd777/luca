CREATE TABLE IF NOT EXISTS production_planning_configs (
  department_id INT PRIMARY KEY REFERENCES departments(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_production_planning_configs_enabled
  ON production_planning_configs(enabled);

INSERT INTO permissions (permission_name, permission_value)
VALUES ('Kế hoạch sản xuất - Quản lý', 'production_planning.manage')
ON CONFLICT (permission_value)
DO UPDATE SET permission_name = EXCLUDED.permission_name;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_value = 'production_planning.manage'
WHERE r.role_name IN ('admin', 'corporate_admin')
ON CONFLICT DO NOTHING;

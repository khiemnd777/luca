-- Restore core production roles and section metadata used by the existing forms.

INSERT INTO roles (role_name, display_name, brief)
VALUES ('technician', 'Kỹ thuật viên', 'Nhân sự phụ trách công đoạn gia công')
ON CONFLICT (role_name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  brief = EXCLUDED.brief;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_value IN (
  'order.development',
  'order.delivery',
  'staff.view',
  'staff.search'
)
WHERE r.role_name = 'technician'
ON CONFLICT DO NOTHING;

-- Existing seed data used the generic "user" role for production staff.
-- Backfill those staff accounts into the restored technician role.
INSERT INTO user_roles (user_id, role_id)
SELECT DISTINCT ur.user_id, tech.id
FROM user_roles ur
JOIN roles current_r
  ON current_r.id = ur.role_id
JOIN staffs s
  ON s.user_staff = ur.user_id
JOIN roles tech
  ON tech.role_name = 'technician'
WHERE current_r.role_name = 'user'
ON CONFLICT DO NOTHING;

INSERT INTO collections (slug, name)
VALUES ('section', 'Phòng ban')
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  deleted_at = NULL;

CREATE TEMP TABLE tmp_v112_section_fields (
  collection_slug TEXT,
  name TEXT,
  label TEXT,
  type TEXT,
  required BOOL,
  "unique" BOOL,
  default_value JSONB,
  options JSONB,
  order_index INT,
  visibility TEXT,
  relation JSONB,
  "table" BOOL,
  form BOOL,
  search BOOL,
  tag TEXT
);

INSERT INTO tmp_v112_section_fields (
  collection_slug,
  name,
  label,
  type,
  required,
  "unique",
  default_value,
  options,
  order_index,
  visibility,
  relation,
  "table",
  form,
  search,
  tag
)
VALUES
  ('section', 'leader_id', 'Leader', 'relation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 1, 'public', '{"target":"section_leader","type":"1","form":"staff","placeholder":"Chọn Leader"}'::jsonb, TRUE, TRUE, FALSE, NULL),
  ('section', 'process_ids', 'Công đoạn', 'relation', FALSE, FALSE, NULL::jsonb, NULL::jsonb, 2, 'public', '{"target":"sections_processes","form":"process"}'::jsonb, FALSE, TRUE, FALSE, NULL);

UPDATE fields f
SET
  label = s.label,
  type = s.type,
  required = s.required,
  "unique" = s."unique",
  default_value = s.default_value,
  options = s.options,
  order_index = s.order_index,
  visibility = s.visibility,
  relation = s.relation,
  "table" = s."table",
  form = s.form,
  search = s.search,
  tag = s.tag
FROM tmp_v112_section_fields s
JOIN collections c
  ON c.slug = s.collection_slug
WHERE f.collection_id = c.id
  AND f.name = s.name;

INSERT INTO fields (
  collection_id,
  name,
  label,
  type,
  required,
  "unique",
  default_value,
  options,
  order_index,
  visibility,
  relation,
  "table",
  form,
  search,
  tag
)
SELECT
  c.id,
  s.name,
  s.label,
  s.type,
  s.required,
  s."unique",
  s.default_value,
  s.options,
  s.order_index,
  s.visibility,
  s.relation,
  s."table",
  s.form,
  s.search,
  s.tag
FROM tmp_v112_section_fields s
JOIN collections c
  ON c.slug = s.collection_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM fields f
  WHERE f.collection_id = c.id
    AND f.name = s.name
);

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.role_name = 'corporate_admin'
  AND (
    p.permission_value LIKE 'department.%'
    OR p.permission_value = 'system_log.read'
    OR p.permission_value = 'rbac.manage'
    OR p.permission_value LIKE 'promotion.%'
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.role_name = 'corporate_admin'
  AND p.permission_value NOT LIKE 'department.%'
  AND p.permission_value <> 'system_log.read'
  AND p.permission_value <> 'rbac.manage'
  AND p.permission_value NOT LIKE 'promotion.%'
ON CONFLICT DO NOTHING;

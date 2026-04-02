import { type Perm, usePermissionChecks, useRoleChecks } from "@core/auth/rbac-utils";
import type { MenuItem } from "@core/module/types";

/**
 * Lọc menu theo cả roles và permissions:
 * - Nếu item không khai báo roles/permissions → pass
 * - Nếu có roles: dùng requireAll ? ALL : ANY
 * - Nếu có permissions: dùng requireAll ? ALL : ANY
 * - Cuối cùng AND hai vế (roleOK && permOK)
 */
export function useMenuByAccess(items: MenuItem[]) {
  const { hasAnyRole, hasAllRoles } = useRoleChecks();
  const { hasAnyPermissions, hasAllPermissions } = usePermissionChecks();

  return items.filter((it) => {
    const requireAll = !!it.requireAll;

    // Roles
    let roleOK = true;
    if (it.roles?.length) {
      roleOK = requireAll ? hasAllRoles(it.roles) : hasAnyRole(it.roles);
    }

    // Permissions
    let permOK = true;
    if (it.permissions?.length) {
      permOK = requireAll
        ? hasAllPermissions(it.permissions as Perm[])
        : hasAnyPermissions(it.permissions as Perm[]);
    }

    return roleOK && permOK;
  });
}

/* Ví dụ sử dụng useMenuByAccess:
const RAW_ITEMS = [
  { key: "home", label: "Dashboard", to: "/" },
  { key: "posts", label: "Posts", to: "/posts", roles: ["editor"], permissions: ["post.manage"] },
  { key: "admin", label: "Admin", to: "/admin", roles: ["admin"], permissions: ["system.manage"] },
];

export function SideMenu() {
  const items = useMenuByAccess(RAW_ITEMS);
  return (
    <nav>
      {items.map((m) => (
        <Link key={m.key} to={m.to}>{m.label}</Link>
      ))}
    </nav>
  );
}
*/


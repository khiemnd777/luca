import { type Perm, usePermissionChecks } from "@core/auth/rbac-utils";
import type { MenuItem } from "@core/module/types";

export function useMenuByPermissions(items: MenuItem[]) {
  const { hasAnyPermissions, hasAllPermissions } = usePermissionChecks();

  return items.filter((it) => {
    const perms: Perm[] | undefined = it.permissions;
    if (!perms?.length) return true;

    return it.requireAll
      ? hasAllPermissions(perms)
      : hasAnyPermissions(perms);
  });
}

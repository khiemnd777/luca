import type { JSX, PropsWithChildren } from "react";
import { usePermissionChecks, type Perm } from "@core/auth/rbac-utils";

type IfPermissionProps = PropsWithChildren<{
  permissions?: Perm[];       // ví dụ: ["rbac.manage", "user.read"] hoặc [101, 202]
  requireAll?: boolean;       // mặc định false (chỉ cần 1 quyền)
  fallback?: JSX.Element | null;
  requireLogin?: boolean;     // mặc định true
}>;

export function IfPermission({
  permissions,
  requireAll = false,
  fallback = null,
  requireLogin = true,
  children,
}: IfPermissionProps) {
  const { isLoggedIn, hasAnyPermissions, hasAllPermissions } = usePermissionChecks();

  if (requireLogin && !isLoggedIn) return fallback;

  // Không truyền permissions => chỉ cần đăng nhập là hiển thị
  if (!permissions || permissions.length === 0) {
    return isLoggedIn ? <>{children}</> : fallback;
  }

  const ok = requireAll ? hasAllPermissions(permissions) : hasAnyPermissions(permissions);
  return ok ? <>{children}</> : fallback;
}

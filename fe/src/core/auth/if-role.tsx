import type { JSX, PropsWithChildren } from "react";
import { useRoleChecks } from "@root/core/auth/rbac-utils";

/* Ví dụ sử dụng <IfRole />:
export function toolbar() {
  return (
    <div>
      <IfRole roles={["editor", "admin"]}>
        <button>New Post</button>
      </IfRole>
      <IfRole roles={["admin"]} fallback={<></>}>
        <button>System Settings</button>
      </IfRole>
    </div>
  );
}
*/
type IfRoleProps = PropsWithChildren<{
  roles?: string[];
  requireAll?: boolean;
  fallback?: JSX.Element | null;
  requireLogin?: boolean; // default true
}>;

export function IfRole({
  roles,
  requireAll = false,
  fallback = null,
  requireLogin = true,
  children,
}: IfRoleProps) {
  const { isLoggedIn, hasAnyRole, hasAllRoles } = useRoleChecks();

  if (requireLogin && !isLoggedIn) return fallback;

  if (!roles || roles.length === 0) {
    return isLoggedIn ? <>{children}</> : fallback;
  }

  const ok = requireAll ? hasAllRoles(roles) : hasAnyRole(roles);
  return ok ? <>{children}</> : fallback;
}

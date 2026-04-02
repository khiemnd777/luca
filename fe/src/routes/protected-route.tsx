import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@store/auth-store";

type Props = {
  roles?: string[];          // optional: yêu cầu role
  requireAllRoles?: boolean; // mặc định any
};

export default function ProtectedRoute({ roles, requireAllRoles = false }: Props) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userRoles = useAuthStore((s) => s.roles);

  if (!isLoggedIn) {
    const curr = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/login?redirect=${curr}`} replace />;
  }

  if (roles && roles.length > 0) {
    const ok = requireAllRoles
      ? roles.every((r) => userRoles.includes(r))
      : roles.some((r) => userRoles.includes(r));
    if (!ok) return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}

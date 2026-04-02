import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { type Perm, useRoleChecks, usePermissionChecks } from "@core/auth/rbac-utils";
import { getRefreshToken } from "@core/network/token-utils";
import {
  didLastRefreshFail,
  hasUsableAccessToken,
  isAuthRefreshing,
  refreshOnce,
  subscribeAuthEvents,
} from "@core/network/auth-session";
import { Box, LinearProgress } from "@mui/material";
import { useAuthStore } from "@store/auth-store";

type RequireAuthProps = {
  roles?: string[];
  permissions?: Perm[];
  requireAll?: boolean;
  loginPath?: string;
  forbiddenPath?: string;
  requireLogin?: boolean; // default true
};

export default function RequireAuth({
  roles,
  permissions,
  requireAll = false,
  loginPath = "/login",
  forbiddenPath = "/forbidden",
  requireLogin = true,
}: RequireAuthProps) {
  const { hasAnyRole, hasAllRoles } = useRoleChecks();
  const { hasAnyPermissions } = usePermissionChecks();
  const bootstrapAuth = useAuthStore((state) => state.bootstrap);

  const navigate = useNavigate();
  const location = useLocation();
  const [, forceAuthStateRefresh] = React.useReducer((value) => value + 1, 0);
  const [recoveringSession, setRecoveringSession] = React.useState(false);
  const [syncingSession, setSyncingSession] = React.useState(false);
  const mountedRef = React.useRef(true);
  const recoveryInFlightRef = React.useRef(false);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribeAuthEvents(() => forceAuthStateRefresh());
    return () => {
      unsubscribe();
    };
  }, []);

  // Auth state
  const usable = hasUsableAccessToken();
  const hasRT = !!getRefreshToken();
  const refreshing = isAuthRefreshing();
  const refreshFailed = didLastRefreshFail();

  const mustLogin = requireLogin && !usable;
  const canRecoverSession = mustLogin && hasRT && !refreshFailed;

  React.useEffect(() => {
    if (!canRecoverSession) {
      recoveryInFlightRef.current = false;
      return;
    }

    if (refreshing || recoveryInFlightRef.current) return;

    recoveryInFlightRef.current = true;
    setRecoveringSession(true);

    void refreshOnce()
      .then((token) => {
        if (!token || !mountedRef.current) return;

        if (mountedRef.current) {
          setRecoveringSession(false);
          setSyncingSession(true);
        }

        void bootstrapAuth().finally(() => {
          if (mountedRef.current) {
            setSyncingSession(false);
          }
        });
      })
      .finally(() => {
        recoveryInFlightRef.current = false;
        if (mountedRef.current) {
          setRecoveringSession(false);
        }
      });
  }, [bootstrapAuth, canRecoverSession, refreshing]);

  const redirectTo = React.useMemo(() => {
    if (mustLogin && (!hasRT || refreshFailed)) {
      const params = new URLSearchParams(window.location.search);
      const loc = window.location;
      const raw = params.get("redirect") ?? (loc.pathname + loc.search);
      const safeRedirect = raw.startsWith(loginPath) ? "/" : raw;
      return `${loginPath}?redirect=${encodeURIComponent(safeRedirect)}`;
    }

    if (canRecoverSession || refreshing || recoveringSession) return null;
    if (syncingSession) return null;
    if (roles?.length) {
      const ok = requireAll ? hasAllRoles(roles) : hasAnyRole(roles);
      if (!ok) return forbiddenPath;
    }
    if (permissions?.length) {
      const ok = hasAnyPermissions(permissions);
      if (!ok) return forbiddenPath;
    }
    return null;
  }, [
    mustLogin,
    hasRT,
    refreshFailed,
    canRecoverSession,
    refreshing,
    recoveringSession,
    syncingSession,
    roles,
    permissions,
    requireAll,
    hasAllRoles,
    hasAnyRole,
    hasAnyPermissions,
    loginPath,
    forbiddenPath,
  ]);

  React.useEffect(() => {
    if (!redirectTo) return;
    if (location.pathname + location.search === redirectTo) return;
    if (redirectTo === forbiddenPath && location.pathname === forbiddenPath) return;
    navigate(redirectTo, { replace: true });
  }, [redirectTo, navigate, location.pathname, location.search, forbiddenPath]);

  const blocking = !!redirectTo;
  const showLoader = blocking || canRecoverSession || refreshing || recoveringSession;

  return (
    <Box sx={{ position: "relative", minHeight: 0 }}>
      {showLoader && (
        <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 13000 }}>
          <LinearProgress />
        </Box>
      )}
      {!showLoader && <Outlet />}
    </Box>
  );
}

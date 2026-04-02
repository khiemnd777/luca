import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@root/store/auth-store";

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      department: s.department,
      roles: s.roles,
      roleObjects: s.roleObjects,
      isLoggedIn: s.isLoggedIn,
      login: s.login,
      logout: s.logout,
      setSession: s.setSession,
      fetchMe: s.fetchMe,
      fetchRoles: s.fetchRoles,
      fetchDepartment: s.fetchDepartment,
      fetchMatrixPermissions: s.fetchMatrixPermissions,
      bootstrap: s.bootstrap,
      hasRole: s.hasRole,
      hasPermission: s.hasPermission,
      departmentApiPath: s.departmentApiPath,
    }))
  );
}

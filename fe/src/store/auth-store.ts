import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ACCESS_KEY,
  REFRESH_KEY,
  getAccessToken,
  getRefreshToken,
} from "@core/network/token-utils";
import { login as apiLogin, logout as apiLogout } from "@core/network/auth-api";
import { fetchMe } from "@core/network/me.api";
import { fetchMyMatrixPermissions, fetchMyRoles } from "@core/network/rbac.api";
import type { MeModel } from "@root/core/auth/auth.types";
import type { MatrixPermission, MyRoleDto } from "@core/network/rbac.types";
import { fetchMyDepartment } from "@core/network/my-department.api";
import type { MyDepartmentDto } from "@core/network/my-department.dto";
import { env } from "@core/config/env";
import { notifyLogin, notifyLogout } from "@core/network/auth-session";

type AuthState = {
  user: MeModel | null;
  department: MyDepartmentDto | null;
  roles: string[];              // danh sách role_name
  roleObjects?: MyRoleDto[];      // (optional) giữ full role để hiển thị
  matrixPermission?: MatrixPermission | null;
  isLoggedIn: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (p: {
    accessToken: string;
    refreshToken: string;
    user?: MeModel | null;
    department?: MyDepartmentDto | null;
    roles?: string[];
    matrixPermission?: MatrixPermission | null;
  }) => void;

  fetchMe: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  fetchDepartment: () => Promise<void>;
  fetchMatrixPermissions: () => Promise<void>;
  bootstrap: () => Promise<void>;

  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  departmentApiPath: () => string;
};

function hasStoredSession(): boolean {
  return !!getAccessToken() || !!getRefreshToken();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      department: null,
      roles: [],
      roleObjects: undefined,
      isLoggedIn: false,

      async login(email, password) {
        const data = await apiLogin(email, password);
        get().setSession({
          accessToken: data[ACCESS_KEY],
          refreshToken: data[REFRESH_KEY],
        });
        // sau khi có token -> nạp hồ sơ + roles + permissions
        await Promise.all([
          get().fetchMe(),
          get().fetchDepartment(),
          get().fetchRoles(),
          get().fetchMatrixPermissions()
        ]);
      },

      async logout() {
        try {
          await apiLogout();
        } finally {
          notifyLogout("user_logout");
          set({ user: null, roles: [], roleObjects: undefined, isLoggedIn: false });
          window.location.href = "/login";
        }
      },

      setSession({ accessToken, refreshToken, user, roles }) {
        notifyLogin({ accessToken, refreshToken });
        set({
          user: user ?? null,
          roles: roles ?? [],
          isLoggedIn: true,
        });
      },

      async fetchMe() {
        if (!hasStoredSession()) return;
        const me = await fetchMe();
        set({ user: me, isLoggedIn: true });
      },

      async fetchDepartment() {
        if (!hasStoredSession()) return;
        const myDept = await fetchMyDepartment();
        set({ department: myDept });
      },

      async fetchRoles() {
        if (!hasStoredSession()) return;
        const list = await fetchMyRoles();
        set({
          roleObjects: list,
          roles: list.map((r) => r.roleName),
          isLoggedIn: true,
        });
      },

      async fetchMatrixPermissions() {
        if (!hasStoredSession()) return;
        const matrix = await fetchMyMatrixPermissions();
        set({
          matrixPermission: matrix,
        });
      },

      async bootstrap() {
        // gọi khi app khởi động: nếu còn access hoặc refresh token thì phục hồi session
        if (!hasStoredSession()) return;
        await Promise.allSettled([
          get().fetchMe(),
          get().fetchDepartment(),
          get().fetchRoles(),
          get().fetchMatrixPermissions()
        ]);
      },

      hasRole(role) {
        return get().roles.includes(role);
      },

      hasPermission(perm) {
        const state = get();
        const matrix = state.matrixPermission;
        if (!matrix || !matrix.permissions?.length || !matrix.roles?.length) return false;

        // Xác định index của permission theo value → name → id
        const idx = matrix.permissions.findIndex((p) => {
          if (typeof perm === "number") return p.id === perm;
          // perm là string
          return p.value === perm || p.name === perm || String(p.id) === perm;
        });
        if (idx < 0) return false;

        // Tập role của user
        const userRoles = new Set(state.roles);
        if (userRoles.size === 0) return false;

        // Nếu bất kỳ role của user có cờ true tại vị trí idx -> có permission
        for (const r of matrix.roles) {
          if (userRoles.has(r.roleName)) {
            if (Array.isArray(r.flags) && r.flags[idx]) return true;
          }
        }
        return false;
      },
      departmentApiPath() {
        const dept = get().department;
        return `${env.apiBasePath}/department/${dept?.id}`;
      }
    }),
    { name: "auth-store" }
  )
);

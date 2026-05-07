import axios from "axios";
import {
  ACCESS_KEY,
  getAccessToken,
  getRefreshToken,
  REFRESH_KEY,
  saveAccessToken,
  saveRefreshToken,
} from "@core/network/token-utils";
import type { AuthResponse, AuthTokenResponse, RefreshTokenResponse } from "@core/network/auth-types";
import { isDepartmentSelectionRequired } from "@core/network/auth-types";
import { env } from "@root/core/config/env";

const baseURL = env.apiBasePath;
const authHttp = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

/**
 * Đăng nhập. Token chỉ được lưu khi backend trả phiên đăng nhập hoàn chỉnh.
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await authHttp.post<AuthResponse>(
    `${baseURL}/auth/login`,
    { phone_or_email: email, password }
  );

  const data = res.data;
  if (!isDepartmentSelectionRequired(data)) {
    saveAccessToken(data[ACCESS_KEY]);
    saveRefreshToken(data[REFRESH_KEY]);
  }
  return data;
}

export async function selectDepartment(
  selectionToken: string,
  departmentId: number,
): Promise<AuthTokenResponse> {
  const res = await authHttp.post<AuthTokenResponse>(
    `${baseURL}/auth/select-department`,
    { selectionToken, department_id: departmentId },
  );

  const data = res.data;
  saveAccessToken(data[ACCESS_KEY]);
  saveRefreshToken(data[REFRESH_KEY]);
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();
  await authHttp
    .post(
      `${baseURL}/auth/logout`,
      { refreshToken },
      accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    )
    .catch(() => {
      // tránh chặn flow logout vì lỗi mạng
    });
}

/**
 * Làm mới access token từ refresh token
 */
export async function refreshAccessToken(
  refreshToken: string | null
): Promise<RefreshTokenResponse> {
  if (!refreshToken) throw new Error("No refresh token");

  const res = await authHttp.post<RefreshTokenResponse>(
    `${baseURL}/auth/refresh-token`,
    { refreshToken },
  );

  const data = res.data;
  saveAccessToken(data[ACCESS_KEY]);
  if (data[REFRESH_KEY]) {
    saveRefreshToken(data[REFRESH_KEY]!);
  }
  return data;
}

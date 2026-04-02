import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  clearTokens,
} from "@core/network/token-utils";
import { refreshAccessToken } from "@core/network/auth-api";
import { env } from "@core/config/env";

const axiosClient = axios.create({
  baseURL: env.apiBasePath,
  headers: { "Content-Type": "application/json" },
});

// ✅ Request: attach token
axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ Response: auto refresh token on 401
axiosClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshed = await refreshAccessToken(getRefreshToken());
        const newToken = refreshed?.accessToken;
        if (newToken) {
          saveAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosClient(originalRequest);
        }
      } catch {
        clearTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

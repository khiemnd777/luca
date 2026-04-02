export const ACCESS_KEY = "accessToken";
export const REFRESH_KEY = "refreshToken";

export const getAccessToken = (): string | null =>
  localStorage.getItem(ACCESS_KEY);

export const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_KEY);

export const saveAccessToken = (token: string) =>
  localStorage.setItem(ACCESS_KEY, token);

export const saveRefreshToken = (token: string) =>
  localStorage.setItem(REFRESH_KEY, token);

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

/** Cấu trúc response khi đăng nhập */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string | number;
    email?: string;
    phone?: string;
    name?: string;
    avatar?: string;
    roles?: string[];
  };
}

/** Cấu trúc response khi refresh token */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string; // một số hệ thống có thể trả lại luôn
}

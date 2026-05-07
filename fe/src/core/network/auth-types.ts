/** Cấu trúc response khi đăng nhập */
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  requiresDepartmentSelection?: false;
  user?: {
    id: string | number;
    email?: string;
    phone?: string;
    name?: string;
    avatar?: string;
    roles?: string[];
  };
}

export interface DepartmentSelectionDepartment {
  id: number;
  active?: boolean;
  name: string;
  slug?: string | null;
  logo?: string | null;
  logoRect?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  phoneNumber2?: string | null;
  phoneNumber3?: string | null;
  email?: string | null;
  tax?: string | null;
}

export interface DepartmentSelectionRequiredResponse {
  requiresDepartmentSelection: true;
  selectionToken: string;
  departments: DepartmentSelectionDepartment[];
}

export type AuthResponse = AuthTokenResponse | DepartmentSelectionRequiredResponse;

export function isDepartmentSelectionRequired(
  response: AuthResponse,
): response is DepartmentSelectionRequiredResponse {
  return response.requiresDepartmentSelection === true;
}

/** Cấu trúc response khi refresh token */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string; // một số hệ thống có thể trả lại luôn
}

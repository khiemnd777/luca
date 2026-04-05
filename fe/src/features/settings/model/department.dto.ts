export interface DepartmentDto {
  id: number;
  active: boolean;
  name: string;
  logo?: string | null;
  logoRect?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

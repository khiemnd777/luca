export interface MyDepartmentDto {
  id: number;
  active: boolean;
  name: string;
  logo?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
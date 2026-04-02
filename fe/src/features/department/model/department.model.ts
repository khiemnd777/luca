export interface DeparmentModel {
  id?: number;
  slug?: string | null;
  administratorId?: number | null;
  active?: boolean;
  name: string;
  logo?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  parentId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

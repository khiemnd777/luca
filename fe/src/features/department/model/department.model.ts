export interface DeparmentModel {
  id?: number;
  slug?: string | null;
  administratorId?: number | null;
  active?: boolean;
  name: string;
  logo?: string | null;
  logoRect?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  phoneNumber2?: string | null;
  phoneNumber3?: string | null;
  email?: string | null;
  tax?: string | null;
  parentId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

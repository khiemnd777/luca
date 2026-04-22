
export interface StaffModel {
  id: number;
  departmentId?: number | null;
  name: string;
  password?: string;
  email: string;
  phone?: string;
  active?: boolean;
  avatar?: string;
  qrCode?: string;
  sectionIds?: number[];
  sectionNames?: string[];
  roleIds?: number[];
  roleNames?: string[];
  customFields?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

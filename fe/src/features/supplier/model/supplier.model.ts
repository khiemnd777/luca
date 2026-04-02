export interface SupplierModel {
  id: number;
  code: string;
  name?: string | null;
  active: boolean;
  customFields?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

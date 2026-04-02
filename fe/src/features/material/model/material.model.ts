export interface MaterialModel {
  id: number;
  code: string;
  name?: string | null;
  type?: string | null;
  isImplant?: boolean;
  active: boolean;
  supplierIds?: number[];
  supplierNames?: string;
  customFields?: Record<string, any> | null;
  retailPrice?: number | null;
  createdAt: string;
  updatedAt: string;
}

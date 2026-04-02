export interface BrandNameModel {
  id: number;
  categoryId?: number | null;
  categoryName?: string | null;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandNameImportResult {
  totalRows: number;
  added: number;
  skipped: number;
  errors?: string[];
}

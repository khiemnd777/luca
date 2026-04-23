export interface RestorationTypeModel {
  id: number;
  categoryId?: number | null;
  categoryName?: string | null;
  code?: string | null;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RestorationTypeImportResult {
  totalRows: number;
  added: number;
  skipped: number;
  errors?: string[];
}

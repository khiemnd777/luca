export interface ProductModel {
  id: number;
  code: string;
  name?: string | null;
  active: boolean;
  customFields?: Record<string, any> | null;
  processIds?: number[];
  processNames?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  retailPrice?: number | null;
  costPrice?: number | null;
  // template
  collectionId?: number | null;
  templateId?: number | null;
  isTemplate: boolean;
  // time
  createdAt: string;
  updatedAt: string;
}

export interface ProductUpsertModel {
  dto: ProductModel;
  collections?: (string | undefined)[];
}

export interface ProductImportResult {
  totalRows: number;
  added: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

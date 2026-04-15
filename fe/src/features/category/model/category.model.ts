export interface CategoryModel {
  id: number;
  code: string;
  name?: string | null;
  active: boolean;
  collectionId?: number | null;
  level?: number | null;
  parentId?: number | null;
  categoryIdLv1?: number | null;
  categoryNameLv1?: string | null;
  categoryIdLv2?: number | null;
  categoryNameLv2?: string | null;
  categoryIdLv3?: number | null;
  categoryNameLv3?: string | null;
  customFields?: Record<string, any> | null;
  relationFields?: Record<string, any> | null;
  productIds?: number[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryUpsertModel {
  dto: CategoryModel;
  collections?: (string | undefined)[];
}

export interface CategoryImportRowResult {
  row_index: number;
  status: string;
  reason?: string;
}

export interface CategoryImportResult {
  totalRows: number;
  addedLV1: number;
  addedLV2: number;
  addedLV3: number;
  skipped: number;
  errors?: string[];
  rows?: CategoryImportRowResult[];
}

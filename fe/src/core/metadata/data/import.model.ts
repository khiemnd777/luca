export type ImportProfileScope = string; // "products" | "orders" | "customers" | ...

export type ImportFieldProfileModel = {
  id: number;
  scope: ImportProfileScope;
  code: string;
  name: string;
  pivotField?: string;
  permission?: string;
  description?: string | null;
  isDefault: boolean;
};

export type ImportFieldMappingModel = {
  id: number;
  profileId: number;

  // own/internal field
  internalKind: string;          // e.g. "core", "custom", "metadata", ...
  internalPath: string;          // e.g. "name", "custom_fields.taxCode"
  internalLabel: string;         // label hiển thị cho người dùng

  // link với metadata (optional, không FK)
  metadataCollectionSlug?: string | null;
  metadataFieldName?: string | null;

  // excel side
  dataType?: string | null;      // text / number / date...
  excelHeader?: string | null;   // header trong file excel
  excelColumn?: number | string | null;   // "A", "B", "C"...

  required: boolean;
  unique: boolean;

  transformHint?: string | null; // transform e.g. "trim|upper|date:dd/MM/yyyy"
};

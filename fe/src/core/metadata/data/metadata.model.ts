export type CollectionModel = {
  id: number;
  slug: string;
  name: string;
  showIf?: string;
};

export type FieldVisibility = "public" | "hidden" | "readonly";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "select"
  | "multiselect"
  | "image"
  | "email"
  | "currency"
  | "currency_equation"
  | "relation"
  ;

export const FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "datetime",
  "boolean",
  "select",
  "multiselect",
  "image",
  "email",
  "currency",
  "currency_equation",
  "relation",
];

export type FieldModel = {
  id: number;
  collectionId: number;
  collectionSlug: string;
  name: string;
  label: string;
  type: FieldType | string;
  required: boolean;
  unique: boolean;
  tag?: string | null;
  table: boolean;
  form: boolean;
  search: boolean;
  defaultValue?: string | null;
  options?: string | null;
  orderIndex: number;
  visibility: FieldVisibility | string;
  relation?: string | null;
};

export type CollectionWithFieldsModel = CollectionModel & {
  fields?: FieldModel[];
  fieldsCount: number;
};

export type FieldDto = {
  collection_id: number;
  collection_slug: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  tag?: string | null;
  table: boolean;
  form: boolean;
  search: boolean;
  default_value?: any;
  options?: any;
  order_index: number;
  visibility?: string;
  relation?: any;
};

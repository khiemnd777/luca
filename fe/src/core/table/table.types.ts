import type { ListResult } from "@core/types/list-result";
import type { LocalizedText } from "@root/core/i18n/localized-text";
import type { SxProps, Theme } from "@mui/material/styles";

export type SortDir = "asc" | "desc";
export type TableViewMode = "table" | "vertical";

export type FetchTableOpts = {
  limit: number;
  page: number; // 0-based
  orderBy?: string | null;
  direction?: SortDir;
};

export type ImageShape = "square" | "circle";
export type ColumnType = "text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "color"
  | "image"
  | "link"
  | "chips"
  | "boolean"
  | "qr"
  | "custom"
  | "metadata"
  | "relation"
  ;

export type MetadataColumnMode = "whole" | "partial";

export type MetadataColumnOptions = {
  collection?: number | string;
  group?: string;
  tag?: string | null;
  mode?: MetadataColumnMode;
  fields?: string[];
  ignoreFields?: string[];
  /*
  def: {
    remakeCount: {
      header: "Số lần remake",
      type: "number",
      accessor: row => row.customFields.remakeCount ?? 0,
    },
    priority: {
      header: "Priority",
      render: (val) => <Tag color="red">{val}</Tag>,
    }
  }
  */
  def?: Record<string, MiniColumnDef>;
};

export type MiniColumnDef = {
  accessor?: (row: any) => unknown;
  header?: LocalizedText;
  type?: ColumnType;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
};

export type QROptions = {
  size?: number;
  tooltipSize?: number;
  level?: "L" | "M" | "Q" | "H";
  fgColor?: string;
  bgColor?: string;
};

export type ColumnDef<T> = {
  key: keyof T | string;
  header?: LocalizedText;
  headerIcon?: React.ReactNode;
  hideHeaderLabel?: boolean;
  width?: number | string;
  type?: ColumnType;
  render?: (row: T) => React.ReactNode;

  // Sorting
  sortable?: boolean;
  accessor?: (row: T) => unknown;
  comparator?: (a: T, b: T) => number;

  // Freeze
  stickyLeft?: boolean;
  stickyRight?: boolean;

  // Present for confirm dialog
  labelField?: boolean;
  present?: (row: T) => string;

  // Image
  shape?: ImageShape;

  // Link
  url?: string | ((row: T) => string);

  // QR
  qr?: QROptions;

  // Metadata
  metadata?: MetadataColumnOptions;
};

export type TableRowActionColor =
  | "inherit"
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export type TableRowAction<T> = {
  key: string;
  label: LocalizedText;
  icon: React.ReactNode;
  onClick: (row: T) => void | Promise<void>;
  permissions?: string[];
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
  color?: TableRowActionColor;
  sx?: SxProps<Theme>;
};

export type TableSchema<T> = {
  columns: ColumnDef<T>[];

  /* Mandatory */
  fetch: (opts: FetchTableOpts & Record<string, any>) => Promise<ListResult<T>>;

  // UI options
  initialPageSize?: number;                // default 20
  initialSort?: { by: string; dir: SortDir };
  stickyHeader?: boolean;                  // default true
  dense?: boolean;                         // default true
  stickyTopOffset?: number;                // default 0
  hidePagination?: boolean;                // default false
  defaultView?: TableViewMode;             // default table

  // row actions
  onView?: (row: T) => void | Promise<void>;
  onRowClick?: (row: T) => void | Promise<void>;
  onEdit?: (row: T) => void | Promise<void>;
  canEdit?: (row: T) => boolean;
  onDelete?: (row: T) => void | Promise<void>;
  canDelete?: (row: T) => boolean;
  rowActions?: TableRowAction<T>[];
  onReorder?: (newRows: T[], from: number, to: number) => void;

  // Permissions
  allowUpdating?: string[] | undefined,
  allowDeleting?: string[] | undefined,

  // lifecycle
  afterReload?: (ctx: FetchTableOpts & { total: number }) => void | Promise<void>;
};

export function createTableSchema<T>(schema: TableSchema<T>): TableSchema<T> {
  return schema;
}

import type { ColumnDef } from "@core/table/table.types";

export function resolveRowLabel<T>(columns: ColumnDef<T>[], row: T): string {
  const chosen =
    columns.find(c => c.labelField) ||
    columns.find(c => c.key === "name") ||
    columns[0];

  if (!chosen) return "";

  if (chosen.present) {
    return chosen.present(row) ?? "";
  }

  const key = chosen.key as string;
  const raw = (row as any)?.[key];

  if (raw == null) return "";
  return typeof raw === "string" ? raw : String(raw);
}
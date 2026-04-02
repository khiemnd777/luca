import type { TableSchema } from "@core/table/table.types";

type TableBuilder<T = any> = () => TableSchema<T>;

const tableRegistry = new Map<string, TableBuilder>();

export function registerTable<T = any>(name: string, build: TableBuilder<T>) {
  tableRegistry.set(name, build as TableBuilder);
}

export function getTableSchema<T = any>(name: string): TableSchema<T> | null {
  const build = tableRegistry.get(name);
  return build ? (build() as TableSchema<T>) : null;
}

import * as React from "react";
import { EditTable } from "@core/table/edit-table";
import type { TableSchema, SortDir, ColumnDef, ColumnType, TableRowAction } from "@core/table/table.types";
import { subscribeTableReload } from "@core/table/table-reload";
import { resolveRowLabel } from "@core/table/table-utils";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import { hasAnyPermissions } from "../auth/rbac-utils";
import { getAvailableCollection, listCollectionsByGroup } from "@core/metadata/data/metadata.api";
import { snakeToCamel } from "@root/shared/utils/string.utils";
import { isJSON, parseJSON } from "@root/shared/utils/json.utils";
import { mapIdFieldToNameField } from "@root/shared/utils/relation.utils";
import { useAsync } from "@core/hooks/use-async";

const metadataGroupCache = new Map<string, Promise<string[]>>();

async function fetchMetadataGroupCollections(group: string, tag?: string | null): Promise<string[]> {
  if (!group) return [];

  let promise = metadataGroupCache.get(group);
  if (!promise) {
    promise = listCollectionsByGroup(group, {
      limit: 1000,
      offset: 0,
      withFields: true,
      tag,
      table: true,
      form: false,
    })
      .then((res) => res.data.map((c) => c.slug))
      .catch((err) => {
        metadataGroupCache.delete(group);
        throw err;
      });
    metadataGroupCache.set(group, promise);
  }

  return promise;
}

async function expandMetadataColumn<T>(col: ColumnDef<T>): Promise<ColumnDef<T>[]> {
  const metadata = col.metadata!;
  const result: ColumnDef<T>[] = [];

  if (metadata.group) {
    try {
      const collections = await fetchMetadataGroupCollections(metadata.group);
      if (!collections.length) return [];

      const { group: _omit, ...restMeta } = metadata;
      const expanded = await Promise.all(
        collections.map((collection) =>
          expandMetadataColumn<T>({
            ...col,
            metadata: {
              ...restMeta,
              collection,
            },
          })
        )
      );
      return expanded.flat();
    } catch (err) {
      console.error("Failed to load metadata group", metadata.group, err);
      return [];
    }
  }

  const { collection, mode = "whole", fields, ignoreFields, def, tag } = metadata;
  if (!collection) return [];
  const schema = await getAvailableCollection(collection, true, tag, true, false);

  let fieldsToUse = schema.fields;
  fieldsToUse = fieldsToUse?.map((f) => ({
    ...f,
    name: snakeToCamel(f.name)
  }));

  const camelIgnores = ignoreFields?.map(snakeToCamel);

  if (mode === "partial" && fields?.length) {
    fieldsToUse = fieldsToUse?.filter(f => fields.includes(f.name));
  }

  if (mode === "whole" && camelIgnores?.length) {
    fieldsToUse = fieldsToUse?.filter(mf => !camelIgnores.includes(mf.name));
  }

  if (fieldsToUse != null) {
    for (const f of fieldsToUse) {
      const fieldName = f.name;
      const overrides = def?.[fieldName];

      const baseKey = `customFields.${fieldName}`;
      const header = overrides?.header ?? f.label ?? fieldName;

      let type: ColumnType;
      if (overrides?.type) {
        type = overrides.type;
      } else if (f.type === "relation") {
        const relation = isJSON(f.relation ?? "") ? parseJSON(f.relation ?? "{}") : {};
        const singleChoice = relation.type === "1";
        type = singleChoice ? "text" : "chips";
      } else {
        type = mapFieldTypeToColumnType(f.type);
      }

      const accessor =
        overrides?.accessor ??
        ((row: any) => {
          if (f.type === "relation") {
            const relation = isJSON(f.relation ?? "") ? parseJSON(f.relation ?? "{}") : {};
            const singleChoice = relation.type === "1";
            const label = mapIdFieldToNameField(fieldName);
            return singleChoice
              ? row.customFields?.[label] ?? row.customFields?.[fieldName]
              : row.customFields?.[fieldName];
          }
          return row.customFields?.[fieldName];
        });

      const sortable = overrides?.sortable ?? false;

      const render = overrides?.render
        ? ((row: any) => overrides.render!(accessor(row), row))
        : undefined;

      result.push({
        key: baseKey,
        header,
        type,
        accessor,
        sortable,
        render,
      });
    }
  }

  return result;
}

async function expandMetadataColumns<T>(columns: ColumnDef<T>[]): Promise<ColumnDef<T>[]> {
  const result: ColumnDef<T>[] = [];

  for (const col of columns) {
    if (col.type !== "metadata" || !col.metadata) {
      result.push(col);
      continue;
    }

    const expanded = await expandMetadataColumn(col);
    result.push(...expanded);
  }

  return result;
}

function mapFieldTypeToColumnType(type: string): ColumnType {
  switch (type) {
    case "text":
    case "textarea":
      return "text";
    case "number":
      return "number";
    case "currency":
    case "currency_equation":
      return "currency";
    case "date":
      return "date";
    case "datetime":
      return "datetime";
    case "boolean":
      return "boolean";
    case "image":
      return "image";
    case "relation": return "relation";
    default:
      return "text";
  }
}

export type SchemaTableRef = { reload: () => void };

type Props<T extends { id?: string | number }> = {
  schema: TableSchema<T>;
  schemaName?: string;
  params?: Record<string, any>;
};

export function ForwardSchemaTable<T extends { id?: string | number }>(
  props: Props<T>,
  ref: React.ForwardedRef<SchemaTableRef>
) {
  const { schema, schemaName, params } = props;

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(schema.initialPageSize ?? 20);
  const [sortBy, setSortBy] = React.useState<string | null>(schema.initialSort?.by ?? null);
  const [sortDir, setSortDir] = React.useState<SortDir>(schema.initialSort?.dir ?? "asc");

  const [rows, setRows] = React.useState<T[]>([]);
  const [total, setTotal] = React.useState<number>(0);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [targetRow, setTargetRow] = React.useState<T | null>(null);

  const { loading, error, reload } = useAsync(
    async () => {
      const res = await schema.fetch({
        limit: pageSize,
        page: page,
        orderBy: sortBy ?? undefined,
        direction: sortDir,
        ...params,
      });
      setRows(res.items ?? []);
      setTotal(res.total ?? 0);
      await Promise.resolve(schema.afterReload?.({
        limit: pageSize,
        page: page,
        orderBy: sortBy ?? undefined,
        direction: sortDir,
        total: res.total ?? 0,
      }));
      return res;
    },
    [schema, page, pageSize, sortBy, sortDir, params],
    { key: schemaName }
  );

  React.useEffect(() => {
    if (!schemaName) return;
    const unsub = subscribeTableReload(schemaName, () => {
      void reload();
    });
    return unsub;
  }, [schemaName, reload]);

  React.useImperativeHandle(ref, () => ({
    reload: () => reload(),
  }));

  const askDelete = React.useCallback((row: T) => {
    if (!schema.onDelete) return;
    setTargetRow(row);
    setConfirmOpen(true);
  }, [schema.onDelete]);

  const handleConfirmDelete = React.useCallback(async () => {
    if (!schema.onDelete || !targetRow) return;
    setConfirming(true);
    try {
      await Promise.resolve(schema.onDelete(targetRow));
      setConfirmOpen(false);
      setTargetRow(null);
      await reload();
    } finally {
      setConfirming(false);
    }
  }, [schema.onDelete, targetRow, reload]);

  const label = React.useMemo(
    () => (targetRow ? resolveRowLabel(schema.columns, targetRow) : ""),
    [targetRow, schema.columns]
  );

  const [expandedColumns, setExpandedColumns] = React.useState<ColumnDef<T>[]>(schema.columns);
  const visibleRowActions = React.useMemo<TableRowAction<T>[]>(() => {
    return (schema.rowActions ?? []).filter((action) =>
      !action.permissions?.length || hasAnyPermissions(...action.permissions)
    );
  }, [schema.rowActions]);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const cols = await expandMetadataColumns(schema.columns);
      if (mounted) setExpandedColumns(cols);
    })();

    return () => {
      mounted = false;
    };
  }, [schema.columns]);
  
  return (
    <>
      <EditTable<T>
        rows={rows}
        columns={expandedColumns}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        onRowClick={schema.onRowClick}
        error={error instanceof Error ? error.message : (typeof error === "string" ? error : null)}

        // sort (server-side)
        onSortChange={(by, dir) => { setSortBy(by); setSortDir(dir); setPage(1); }}
        sortBy={sortBy}
        sortDirection={sortDir}

        // ui
        stickyHeader={schema.stickyHeader ?? true}
        dense={schema.dense ?? true}
        stickyTopOffset={schema.stickyTopOffset ?? 0}

        // actions
        onView={hasAnyPermissions(...(schema.allowUpdating ?? [])) ? schema.onView : undefined}
        onEdit={hasAnyPermissions(...(schema.allowUpdating ?? [])) ? schema.onEdit : undefined}
        onDelete={hasAnyPermissions(...(schema.allowDeleting ?? [])) ? (schema.onDelete ? askDelete : undefined) : undefined}
        rowActions={visibleRowActions}
        onReorder={schema.onReorder}
      />
      {schema.onDelete && (
        <ConfirmDialog
          open={confirmOpen}
          confirming={confirming}
          onClose={() => { if (!confirming) { setConfirmOpen(false); setTargetRow(null); } }}
          onConfirm={handleConfirmDelete}
          title="Xóa mục này?"
          content={
            label
              ? <>Bạn có chắc muốn xóa&nbsp;<b>{label}</b>&nbsp;không? Hành động này không thể hoàn tác.</>
              : "Bạn có chắc muốn xóa mục này? Hành động này không thể hoàn tác."
          }
          confirmText="Xóa"
          cancelText="Hủy"
        />
      )}
    </>
  );
}

export const SchemaTable = React.forwardRef(ForwardSchemaTable) as
  <T extends { id?: string | number }>(p: Props<T> & { ref?: React.Ref<SchemaTableRef> }) => React.ReactElement;

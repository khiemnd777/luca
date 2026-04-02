import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { RestorationTypeModel } from "@features/restoration_type/model/restoration_type.model";
import { table, unlink } from "@features/restoration_type/api/restoration_type.api";

const columns: ColumnDef<RestorationTypeModel>[] = [
  { key: "name", header: "Kiểu phục hình", sortable: true, labelField: true },
  { key: "categoryName", header: "Danh mục", sortable: true },
];

registerTable("restoration_types", () => {
  return createTableSchema<RestorationTypeModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["product.update"],
    allowDeleting: ["product.delete"],
    onEdit(row: RestorationTypeModel) {
      openFormDialog("restoration_type", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("restoration_types");
    },
  });
});

import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { TechniqueModel } from "@features/technique/model/technique.model";
import { table, unlink } from "@features/technique/api/technique.api";

const columns: ColumnDef<TechniqueModel>[] = [
  { key: "name", header: "Công nghệ", sortable: true, labelField: true },
  { key: "categoryName", header: "Danh mục", sortable: true },
];

registerTable("techniques", () => {
  return createTableSchema<TechniqueModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["product.update"],
    allowDeleting: ["product.delete"],
    onEdit(row: TechniqueModel) {
      openFormDialog("technique", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("techniques");
    },
  });
});

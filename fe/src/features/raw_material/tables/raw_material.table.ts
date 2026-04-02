import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { RawMaterialModel } from "@features/raw_material/model/raw_material.model";
import { table, unlink } from "@features/raw_material/api/raw_material.api";

const columns: ColumnDef<RawMaterialModel>[] = [
  { key: "name", header: "Nguyên liệu", sortable: true, labelField: true },
  { key: "categoryName", header: "Danh mục", sortable: true },
];

registerTable("raw_materials", () => {
  return createTableSchema<RawMaterialModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["product.update"],
    allowDeleting: ["product.delete"],
    onEdit(row: RawMaterialModel) {
      openFormDialog("raw_material", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("raw_materials");
    },
  });
});

import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { BrandNameModel } from "@features/brand_name/model/brand_name.model";
import { table, unlink } from "@features/brand_name/api/brand_name.api";

const columns: ColumnDef<BrandNameModel>[] = [
  { key: "name", header: "Thương hiệu", sortable: true, labelField: true },
  { key: "categoryName", header: "Danh mục", sortable: true },
];

registerTable("brand_names", () => {
  return createTableSchema<BrandNameModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["product.update"],
    allowDeleting: ["product.delete"],
    onEdit(row: BrandNameModel) {
      openFormDialog("brand_name", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("brand_names");
    },
  });
});

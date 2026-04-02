import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { SupplierModel } from "@features/supplier/model/supplier.model";
import { table, unlink } from "@features/supplier/api/supplier.api";

const columns: ColumnDef<SupplierModel>[] = [
  { key: "code", header: "Mã nhà cung cấp", sortable: true, },
  { key: "name", header: "Tên nhà cung cấp", sortable: true, labelField: true },
  {
    key: "",
    type: "metadata",
    metadata: {
      collection: "supplier",
      mode: "whole",
    }
  },
];

registerTable("suppliers", () => {
  return createTableSchema<SupplierModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["supplier.update"],
    allowDeleting: ["supplier.delete"],
    onEdit(row: SupplierModel) {
      openFormDialog("supplier", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("suppliers");
    },
  });
});

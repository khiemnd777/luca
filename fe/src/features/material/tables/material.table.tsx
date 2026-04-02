import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { MaterialModel } from "@features/material/model/material.model";
import { table, unlink } from "@features/material/api/material.api";
import { materialTypeLabel } from "../utils/material.utils";

const columns: ColumnDef<MaterialModel>[] = [
  { key: "code", header: "Mã vật tư", sortable: true, },
  { key: "name", header: "Tên vật tư", sortable: true, labelField: true },
  { 
    key: "type", 
    header: "Loại", 
    render(row) {
      return <>{materialTypeLabel(row.type)}</>;
    },
    sortable: true, 
  },
  // { key: "supplierNames", header: "Nhà cung cấp", width: 140, type: "chips" },
  {
    key: "",
    type: "metadata",
    metadata: {
      collection: "material",
      mode: "whole",
    }
  },
];

registerTable("materials", () => {
  return createTableSchema<MaterialModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["material.update"],
    allowDeleting: ["material.delete"],
    onEdit(row: MaterialModel) {
      openFormDialog("material", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("materials");
    },
  });
});

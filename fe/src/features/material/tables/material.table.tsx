import { Chip } from "@mui/material";
import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { MaterialModel } from "@features/material/model/material.model";
import { table, unlink } from "@features/material/api/material.api";

const columns: ColumnDef<MaterialModel>[] = [
  { key: "name", header: "Tên vật tư", sortable: true, labelField: true },
  {
    key: "isImplant",
    header: "",
    sortable: false,
    render(row) {
      if (!row.isImplant) return null;
      return <Chip size="small" label="Dành cho implant" color="primary" variant="outlined" />;
    },
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

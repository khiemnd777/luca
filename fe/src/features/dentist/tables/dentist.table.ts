import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { DentistModel } from "@features/dentist/model/dentist.model";
import { table, unlink } from "@features/dentist/api/dentist.api";
import { reloadTable } from "@core/table/table-reload";

const columns: ColumnDef<DentistModel>[] = [
  { key: "name", header: "Tên Nha Sĩ", sortable: true, labelField: true, },
  { key: "phoneNumber", header: "Số Điện Thoại" },
  { key: "brief", header: "Mô Tả", width: 500 },
];

registerTable("dentists", () =>
  createTableSchema<DentistModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["clinic.update"],
    allowDeleting: ["clinic.delete"],
    onEdit(row) {
      openFormDialog("dentist", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("dentists");
    },
  })
);

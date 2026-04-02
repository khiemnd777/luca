import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { PatientModel } from "@features/patient/model/patient.model";
import { table, unlink } from "@features/patient/api/patient.api";
import { reloadTable } from "@core/table/table-reload";

const columns: ColumnDef<PatientModel>[] = [
  { key: "name", header: "Tên bệnh nhân", sortable: true, labelField: true, },
  { key: "phoneNumber", header: "Số điện thoại" },
  { key: "brief", header: "Mô Tả", width: 500 },
];

registerTable("patients", () =>
  createTableSchema<PatientModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["clinic.update"],
    allowDeleting: ["clinic.delete"],
    onEdit(row) {
      openFormDialog("patient", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("patients");
    },
  })
);

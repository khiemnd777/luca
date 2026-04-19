import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import type { ClinicModel } from "@features/clinic/model/clinic.model";
import { table, unlink } from "@features/clinic/api/clinic.api";
import { reloadTable } from "@core/table/table-reload";
import { navigate } from "@root/core/navigation/navigate";

const columns: ColumnDef<ClinicModel>[] = [
  // { key: "id", header: "ID", width: 50, sortable: true },
  { key: "logo", header: "Logo", type: "image", shape: "circle", width: 56 },
  { key: "name", header: "Tên Nha Khoa", sortable: true, labelField: true },
  { key: "phoneNumber", header: "Số Điện Thoại", },
  {
    key: "",
    type: "metadata",
    metadata: {
      collection: "clinic",
      mode: "whole",
    }
  },
  { key: "brief", header: "Mô Tả", width: 500 },
];

registerTable("clinics", () => {
  return createTableSchema<ClinicModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["clinic.update"],
    allowDeleting: ["clinic.delete"],
    onEdit(row: ClinicModel) {
      navigate(`/clinic/${row.id}`);
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("clinics");
    },
  });
});

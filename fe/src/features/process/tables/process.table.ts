import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { openFormDialog } from "@core/form/form-dialog.service";
import type { ProcessModel } from "@features/process/model/process.model";
import { table, unlink } from "@features/process/api/process.api";

const columns: ColumnDef<ProcessModel>[] = [
  { key: "name", header: "Tên công đoạn", sortable: true, labelField: true },
  { key: "sectionName", header: "Phòng ban", sortable: true },
  { key: "color", header: "Màu phòng ban", type: "color" },
  {
    key: "",
    type: "metadata",
    metadata: {
      collection: "process",
      mode: "whole",
    }
  },
];

registerTable("process", () => {
  return createTableSchema<ProcessModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["process.update"],
    allowDeleting: ["process.delete"],
    onEdit(row: ProcessModel) {
      openFormDialog("process", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("process");
    },
  });
});

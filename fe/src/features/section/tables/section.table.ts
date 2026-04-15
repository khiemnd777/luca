import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import type { SectionModel } from "@features/section/model/section.model";
import { table, unlink } from "@features/section/api/section.api";
import { reloadTable } from "@root/core/table/table-reload";
import { navigate } from "@root/core/navigation/navigate";

const columns: ColumnDef<SectionModel>[] = [
  { key: "name", header: "Tên phòng ban", sortable: true, labelField: true },
  { key: "color", header: "Màu chủ đề", type: "color" },
  { key: "leaderName", header: "Trưởng phòng" },
];

registerTable("sections", () =>
  createTableSchema<SectionModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["staff.update"],
    allowDeleting: ["staff.delete"],
    onEdit(row) {
      // openFormDialog("section", { initial: { id: row.id } });
      navigate(`/section/${row.id}`);
    },
    // onView(row) {
    //   navigate(`/section/${row.id}`);
    // },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("sections");
    },
  })
);

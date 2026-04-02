import { openFormDialog } from "@core/form/form-dialog.service";
import { navigate } from "@core/navigation/navigate";
import { reloadTable } from "@core/table/table-reload";
import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { childrenList, unlink } from "@features/department/api/department.api";
import type { DeparmentModel } from "@features/department/model/department.model";

const columns: ColumnDef<DeparmentModel>[] = [
  { key: "name", header: "Tên chi nhánh", sortable: true, labelField: true },
  { key: "phoneNumber", header: "Số điện thoại", sortable: true },
  { key: "address", header: "Địa chỉ", sortable: true },
  { key: "active", header: "Kích hoạt", type: "boolean", sortable: true },
  { key: "updatedAt", header: "Cập nhật lúc", type: "datetime", sortable: true },
];

registerTable("department-children", () =>
  createTableSchema<DeparmentModel>({
    columns,
    fetch: async (opts: FetchTableOpts & { deptId?: number }) => {
      return childrenList(opts);
    },
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["department.update"],
    allowDeleting: ["department.delete"],
    onView(row) {
      navigate(`/department/${row.id}`);
    },
    onEdit(row) {
      openFormDialog("department", { initial: { id: row.id } });
    },
    async onDelete(row) {
      await unlink(Number(row.id));
      reloadTable("department-children");
    },
  })
);


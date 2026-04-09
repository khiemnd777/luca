/* eslint-disable react-refresh/only-export-components */
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import { Button } from "@mui/material";
import { IfPermission } from "@core/auth/if-permission";
import { openFormDialog } from "@core/form/form-dialog.service";
import { navigate } from "@core/navigation/navigate";
import { reloadTable } from "@core/table/table-reload";
import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { childrenList, unlink } from "@features/department/api/department.api";
import { useDepartmentDashboardDialogStore } from "@features/department/model/department-dashboard-dialog.store";
import type { DeparmentModel } from "@features/department/model/department.model";

function DepartmentReportAction({ row }: { row: DeparmentModel }) {
  const openDialog = useDepartmentDashboardDialogStore((state) => state.openDialog);

  return (
    <IfPermission permissions={["order.view"]}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AssessmentOutlinedIcon fontSize="small" />}
        onClick={(event) => {
          event.stopPropagation();
          openDialog(row);
        }}
      >
        Xem báo cáo
      </Button>
    </IfPermission>
  );
}

const columns: ColumnDef<DeparmentModel>[] = [
  { key: "name", header: "Tên chi nhánh", sortable: true, labelField: true },
  { key: "phoneNumber", header: "Số điện thoại", sortable: true },
  { key: "address", header: "Địa chỉ", sortable: true },
  { key: "active", header: "Kích hoạt", type: "boolean", sortable: true },
  { key: "updatedAt", header: "Cập nhật lúc", type: "datetime", sortable: true },
  {
    key: "report",
    header: "Báo cáo",
    width: 170,
    render: (row) => <DepartmentReportAction row={row} />,
  },
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

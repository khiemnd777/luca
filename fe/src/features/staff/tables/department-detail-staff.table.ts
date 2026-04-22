import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import PersonRemoveAlt1OutlinedIcon from "@mui/icons-material/PersonRemoveAlt1Outlined";
import { createElement } from "react";
import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import { reloadTable } from "@core/table/table-reload";
import { navigate } from "@root/core/navigation/navigate";
import type { StaffModel } from "@features/staff/model/staff.model";
import {
  assignAdminToDepartment,
  tableByDepartment,
  unassignAdminFromDepartment,
  unlinkFromDepartment,
} from "@features/staff/api/staff.api";

function isDepartmentAdmin(row: StaffModel, administratorId?: number | null): boolean {
  return !!administratorId && row.id === administratorId;
}

export function createDepartmentDetailStaffTableSchema(
  departmentId: number,
  administratorId?: number | null,
) {
  const columns: ColumnDef<StaffModel>[] = [
    { key: "avatar", header: "Avatar", type: "image", shape: "circle", width: 80 },
    { key: "name", header: "Tên Nhân Sự", sortable: true, labelField: true, width: 180 },
    { key: "email", header: "Email", sortable: true, width: 260 },
    { key: "phone", header: "Số Điện Thoại", width: 180 },
    {
      key: "roleNames",
      header: "Vai trò",
      type: "chips",
      width: 180,
      accessor: (row) => {
        const chips = row.roleNames?.filter((roleName) => roleName.trim().toLowerCase() !== "admin") ?? [];
        if (isDepartmentAdmin(row, administratorId)) {
          return [{ text: "Admin", color: "#1976d2" }, ...chips];
        }
        return chips;
      },
    },
    {
      key: "",
      type: "metadata",
      metadata: {
        collection: "staff",
        mode: "whole",
      },
    },
    { key: "active", header: "Kích hoạt?", sortable: true, type: "boolean" },
  ];

  return createTableSchema<StaffModel>({
    columns,
    fetch: async (opts: FetchTableOpts & { departmentId?: number }) =>
      tableByDepartment(opts.departmentId, opts),
    initialPageSize: 20,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["staff.update"],
    allowDeleting: ["staff.delete"],
    onEdit(row) {
      navigate(`/staff/${row.id}`);
    },
    rowActions: [
      {
        key: "assign-admin",
        label: "Assign Admin",
        icon: createElement(AdminPanelSettingsOutlinedIcon, { fontSize: "small" }),
        permissions: ["department.*"],
        visible: (row) => !isDepartmentAdmin(row, administratorId),
        onClick: async (row) => {
          if (!departmentId) return;
          await assignAdminToDepartment(row.id, departmentId);
          reloadTable("department-detail-staffs");
        },
      },
      {
        key: "unassign-admin",
        label: "Bỏ Assign Admin",
        icon: createElement(PersonRemoveAlt1OutlinedIcon, { fontSize: "small" }),
        permissions: ["department.*"],
        visible: (row) => isDepartmentAdmin(row, administratorId),
        color: "warning",
        onClick: async (row) => {
          if (!departmentId) return;
          await unassignAdminFromDepartment(row.id, departmentId);
          reloadTable("department-detail-staffs");
        },
      },
    ],
    async onDelete(row) {
      await unlinkFromDepartment(departmentId > 0 ? departmentId : undefined, row.id);
      reloadTable("department-detail-staffs");
    },
  })
}

registerTable("department-detail-staffs", () =>
  createDepartmentDetailStaffTableSchema(0)
);

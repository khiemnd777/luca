import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import type { RoleModel } from "@features/rbac/model/role.model";
import { fetchRoles } from "@root/features/rbac/api/rbac.api";
import { openFormDialog } from "@root/core/form/form-dialog.service";

const columns: ColumnDef<RoleModel>[] = [
  // { key: "id", header: "ID", width: 80, sortable: true },
  { key: "displayName", header: "Tên Hiển Thị", sortable: true },
  { key: "roleName", header: "Tên Hệ Thống", width: 220, sortable: true, },
  { key: "brief", header: "Mô Tả" },
];

registerTable("roles", () =>
  createTableSchema<RoleModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await fetchRoles(opts),
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    onEdit(row) {
      openFormDialog("role", { initial: { id: row.id } });
    },
  })
);

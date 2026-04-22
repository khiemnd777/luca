import { registerTable } from "@core/table/table-registry";
import { createTableSchema, type ColumnDef, type FetchTableOpts } from "@core/table/table.types";
import type { StaffModel } from "@features/staff/model/staff.model";
import { table, unlink } from "@features/staff/api/staff.api";
import { reloadTable } from "@core/table/table-reload";
import { navigate } from "@root/core/navigation/navigate";
import { createBackNavigationState } from "@core/navigation/back-navigation";

const columns: ColumnDef<StaffModel>[] = [
  { key: "avatar", header: "Avatar", type: "image", shape: "circle", width: 80 },
  { key: "name", header: "Tên Nhân Sự", sortable: true, labelField: true, width: 180 },
  // { key: "sectionNames", header: "Bộ Phận", width: 140, type: "chips" },
  { key: "email", header: "Email", sortable: true, width: 260 },
  { key: "phone", header: "Số Điện Thoại", width: 180 },
  {
    key: "",
    type: "metadata",
    metadata: {
      collection: "staff",
      mode: "whole",
    }
  },
  { key: "active", header: "Kích hoạt?", sortable: true, type: "boolean", },
  // {
  //   key: "qrCode", header: "Mã QR", type: "qr", width: 56,
  //   qr: {
  //     size: 56,
  //     tooltipSize: 220,
  //     level: "M",
  //   }
  // },
];

registerTable("staffs", () =>
  createTableSchema<StaffModel>({
    columns,
    fetch: async (opts: FetchTableOpts) => await table(opts),
    initialPageSize: 20,
    initialSort: { by: "id", dir: "asc" },
    allowUpdating: ["staff.update"],
    allowDeleting: ["staff.delete"],
    onEdit(row) {
      // openFormDialog("staff-edit-dialog", { initial: { id: row.id } });
      navigate(`/staff/${row.id}`, { state: createBackNavigationState() });
    },
    // onView(row) {
    //   navigate(`/staff/${row.id}`);
    // },
    async onDelete(row) {
      await unlink(row.id);
      reloadTable("staffs");
    },
  })
);

import { registerFormDialog } from "@core/form/form-dialog.registry";
import { buildStaffSchemaShared } from "./staff.schema.shared";

export function buildStaffEditDialogSchema() {
  return buildStaffSchemaShared({ withPassword: true, passwordRequired: true });
}

registerFormDialog("staff-edit-dialog", buildStaffEditDialogSchema, {
  title: { create: "Thêm nhân sự", update: "Cập nhật nhân sự" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

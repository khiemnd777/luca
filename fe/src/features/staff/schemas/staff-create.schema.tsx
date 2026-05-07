import { registerForm } from "@core/form/form-registry";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { buildStaffSchemaShared } from "./staff.schema.shared";

export function buildStaffCreateSchema() {
  return buildStaffSchemaShared({ withPassword: true, passwordRequired: true });
}

export function buildDepartmentStaffCreateSchema() {
  return buildStaffSchemaShared({
    withPassword: true,
    passwordRequired: true,
    createDepartmentId: -1,
    reloadTableNames: ["department-detail-staffs"],
    withExistingStaffSearch: true,
  });
}

registerForm("staff-create", buildStaffCreateSchema);
registerFormDialog("staff-create", buildStaffCreateSchema, {
  title: { create: "Thêm nhân sự", update: "Cập nhật nhân sự" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

registerForm("department-staff-create", buildDepartmentStaffCreateSchema);
registerFormDialog("department-staff-create", buildDepartmentStaffCreateSchema, {
  title: { create: "Thêm nhân sự", update: "Cập nhật nhân sự" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

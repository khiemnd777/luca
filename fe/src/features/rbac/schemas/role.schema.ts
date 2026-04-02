import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { mapper } from "@core/mapper/auto-mapper";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { createRole, fetchRoleByID, updateRole } from "@features/rbac/api/rbac.api";
import type { RoleModel } from "@features/rbac/model/role.model";
import { reloadTable } from "@core/table/table-reload";
import { EV_RBAC_MATRIX_INVALIDATE } from "@features/rbac/model/rbac.events";
import { invalidate } from "@core/module/event-invalidation";

export function buildRoleSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "displayName",
      label: "Tên hiển thị",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên hiển thị",
        maxLength: 50,
      },
    },
    {
      name: "roleName",
      label: "Tên hệ thống",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên hệ thống",
        maxLength: 20,
      },
      // derive: {
      //   field: "displayName",
      //   mode: "whenEmpty",
      //   map: (srcVal) => slugify(String(srcVal ?? "")),
      // },
    },
    {
      name: "brief",
      label: "Mô tả",
      kind: "textarea",
      rules: { maxLength: 300 },
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await createRole(values.dto as RoleModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await updateRole(values.dto as RoleModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo vai trò "${values?.displayName ?? ""}" thành công!`
          : `Cập nhật vai trò "${values?.displayName ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo vai trò "${values?.displayName ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật vai trò "${values?.displayName ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await fetchRoleByID(data.id);
      }
      return {};
    },

    async afterSaved() {
      // reload table
      reloadTable("roles");
      // invalidate
      invalidate(EV_RBAC_MATRIX_INVALIDATE, { reason: "role:save" });
    },

    hooks: {
      mapToDto: (v) => mapper.map("Role", v, "model_to_dto"),
    },
  };
}

registerFormDialog("role", buildRoleSchema, {
  title: { create: "Thêm vai trò", update: "Cập nhật vai trò" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

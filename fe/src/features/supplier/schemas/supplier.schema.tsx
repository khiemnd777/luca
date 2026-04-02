import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/supplier/api/supplier.api";
import type { SupplierModel } from "@features/supplier/model/supplier.model";

export function buildSampleSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "code",
      label: "Mã nhà cung cấp",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập mã nhà cung cấp",
        maxLength: 30,
      },
    },
    {
      name: "name",
      label: "Tên nhà cung cấp",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên nhà cung cấp",
        maxLength: 200,
      },
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "supplier",
        mode: "whole",
      }
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await create(values.dto as SupplierModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as SupplierModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nhà cung cấp "${values?.name ?? ""}" thành công!`
          : `Cập nhật nhà cung cấp "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nhà cung cấp "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật nhà cung cấp "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("suppliers");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Supplier", v, "model_to_dto"),
    },
  };
}

registerForm("supplier", buildSampleSchema);

registerFormDialog("supplier", buildSampleSchema, {
  title: { create: "Thêm nhà cung cấp", update: "Cập nhật nhà cung cấp" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

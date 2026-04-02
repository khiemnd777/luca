import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/customer/api/customer.api";
import type { CustomerModel } from "@features/customer/model/customer.model";

export function buildSampleSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "code",
      label: "Mã khách hàng",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập mã khách hàng",
        maxLength: 30,
      },
    },
    {
      name: "name",
      label: "Tên khách hàng",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên khách hàng",
        maxLength: 200,
      },
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "customer",
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
          await create(values.dto as CustomerModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as CustomerModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo khách hàng "${values?.name ?? ""}" thành công!`
          : `Cập nhật khách hàng "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo khách hàng "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật khách hàng "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("customers");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Customer", v, "model_to_dto"),
    },
  };
}

registerForm("customer", buildSampleSchema);

registerFormDialog("customer", buildSampleSchema, {
  title: { create: "Thêm khách hàng", update: "Cập nhật khách hàng" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/process/api/process.api";
import type { ProcessModel } from "@features/process/model/process.model";

export function buildSampleSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên công đoạn",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên công đoạn",
        maxLength: 200,
      },
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "process",
        mode: "whole",
        groups: [
          {
            group: "description",
            fields: ["customFields.description"],
          }
        ],
      }
    },
  ];

  return {
    idField: "id",
    fields,
    groups: [
      {
        name: "general",
        col: 2,
      },
      {
        name: "description",
        col: 1,
      }
    ],
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await create(values.dto as ProcessModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as ProcessModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo công đoạn "${values?.name ?? ""}" thành công!`
          : `Cập nhật công đoạn "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo công đoạn "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật công đoạn "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("process");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Process", v, "model_to_dto"),
    },
  };
}

registerForm("process", buildSampleSchema);

registerFormDialog("process", buildSampleSchema, {
  title: { create: "Thêm công đoạn", update: "Cập nhật công đoạn" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

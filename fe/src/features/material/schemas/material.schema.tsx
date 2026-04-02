import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/material/api/material.api";
import type { MaterialModel } from "@features/material/model/material.model";
import { MATERIAL_TYPES } from "../utils/material.utils";

export function buildSampleSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "code",
      label: "Mã vật tư",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập mã vật tư",
        maxLength: 30,
      },
    },
    {
      name: "name",
      label: "Tên vật tư",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên vật tư",
        maxLength: 200,
      },
    },
    {
      name: "type",
      label: "Loại",
      kind: "select",
      options: [...MATERIAL_TYPES],
    },
    {
      name: "isImplant",
      label: "Dành cho implant",
      kind: "switch",
      defaultValue: false,
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "material",
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
      },
    ],
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await create(values.dto as MaterialModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as MaterialModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo vật tư "${values?.name ?? ""}" thành công!`
          : `Cập nhật vật tư "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo vật tư "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật vật tư "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("materials");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Material", v, "model_to_dto"),
    },
  };
}

registerForm("material", buildSampleSchema);

registerFormDialog("material", buildSampleSchema, {
  title: { create: "Thêm vật tư", update: "Cập nhật vật tư" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

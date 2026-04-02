import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/raw_material/api/raw_material.api";
import type { RawMaterialModel } from "@features/raw_material/model/raw_material.model";
import { categoryProps } from "@features/category/utils/category.props";

export function buildRawMaterialSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên nguyên liệu",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên nguyên liệu",
        maxLength: 200,
      },
    },
    {
      name: "categoryId",
      label: "Danh mục",
      kind: "searchsingle",
      placeholder: "Chọn danh mục",
      pageLimit: 20,
      ...categoryProps,
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await create(values.dto as RawMaterialModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as RawMaterialModel);
          return values.dto;
        },
      },
    },
    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nguyên liệu "${values?.name ?? ""}" thành công!`
          : `Cập nhật nguyên liệu "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo nguyên liệu "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật nguyên liệu "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },
    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },
    async afterSaved() {
      reloadTable("raw_materials");
    },
    hooks: {
      mapToDto: (v) => mapper.map("RawMaterial", v, "model_to_dto"),
    },
  };
}

registerForm("raw_material", buildRawMaterialSchema);

registerFormDialog("raw_material", buildRawMaterialSchema, {
  title: { create: "Thêm nguyên liệu", update: "Cập nhật nguyên liệu" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

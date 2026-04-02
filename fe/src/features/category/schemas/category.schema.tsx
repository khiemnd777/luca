import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/category/api/category.api";
import type { CategoryUpsertModel } from "@features/category/model/category.model";
import { categoryProps } from "../utils/category.props";
import { processProps } from "@root/features/process/utils/process.props";

export function buildCategorySchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên danh mục",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên danh mục",
        maxLength: 200,
      },
    },
    {
      name: "parentId",
      label: "Danh mục cha",
      kind: "searchsingle",
      placeholder: "Chọn danh mục cha",
      pageLimit: 20,
      ...categoryProps,
    },
    {
      name: "level",
      label: "Cấp",
      kind: "number",
      defaultValue: 1,
      disableIf: () => true,
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "category",
        mode: "whole",
        def: [
          {
            name: "processIds",
            ...processProps,
          },
        ],
      }
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: {
        type: "fn",
        run: async (dto, _) => {
          await create(dto as CategoryUpsertModel);
          return dto;
        },
      },
      update: {
        type: "fn",
        run: async (dto, _) => {
          await update(dto as CategoryUpsertModel);
          return dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo danh mục "${values?.name ?? ""}" thành công!`
          : `Cập nhật danh mục "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo danh mục "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật danh mục "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("categories");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Category", v, "model_to_dto"),
    },
  };
}

registerForm("category", buildCategorySchema);

registerFormDialog("category", buildCategorySchema, {
  title: { create: "Thêm danh mục", update: "Cập nhật danh mục" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/brand_name/api/brand_name.api";
import type { BrandNameModel } from "@features/brand_name/model/brand_name.model";
import { categoryProps } from "@features/category/utils/category.props";

export function buildBrandNameSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên thương hiệu",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên thương hiệu",
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
          await create(values.dto as BrandNameModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as BrandNameModel);
          return values.dto;
        },
      },
    },
    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo thương hiệu "${values?.name ?? ""}" thành công!`
          : `Cập nhật thương hiệu "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo thương hiệu "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật thương hiệu "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },
    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },
    async afterSaved() {
      reloadTable("brand_names");
    },
    hooks: {
      mapToDto: (v) => mapper.map("BrandName", v, "model_to_dto"),
    },
  };
}

registerForm("brand_name", buildBrandNameSchema);

registerFormDialog("brand_name", buildBrandNameSchema, {
  title: { create: "Thêm thương hiệu", update: "Cập nhật thương hiệu" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

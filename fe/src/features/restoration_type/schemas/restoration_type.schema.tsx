import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/restoration_type/api/restoration_type.api";
import type { RestorationTypeModel } from "@features/restoration_type/model/restoration_type.model";
import { categoryProps } from "@features/category/utils/category.props";

export function buildRestorationTypeSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên kiểu phục hình",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập kiểu phục hình",
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
          await create(values.dto as RestorationTypeModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as RestorationTypeModel);
          return values.dto;
        },
      },
    },
    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo kiểu phục hình "${values?.name ?? ""}" thành công!`
          : `Cập nhật kiểu phục hình "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo kiểu phục hình "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật kiểu phục hình "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },
    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },
    async afterSaved() {
      reloadTable("restoration_types");
    },
    hooks: {
      mapToDto: (v) => mapper.map("RestorationType", v, "model_to_dto"),
    },
  };
}

registerForm("restoration_type", buildRestorationTypeSchema);

registerFormDialog("restoration_type", buildRestorationTypeSchema, {
  title: { create: "Thêm kiểu phục hình", update: "Cập nhật kiểu phục hình" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

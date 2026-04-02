import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/technique/api/technique.api";
import type { TechniqueModel } from "@features/technique/model/technique.model";
import { categoryProps } from "@features/category/utils/category.props";

export function buildTechniqueSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "name",
      label: "Tên công nghệ",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên kỹ thuật",
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
          await create(values.dto as TechniqueModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values.dto as TechniqueModel);
          return values.dto;
        },
      },
    },
    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo kỹ thuật "${values?.name ?? ""}" thành công!`
          : `Cập nhật kỹ thuật "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo kỹ thuật "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật kỹ thuật "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },
    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },
    async afterSaved() {
      reloadTable("techniques");
    },
    hooks: {
      mapToDto: (v) => mapper.map("Technique", v, "model_to_dto"),
    },
  };
}

registerForm("technique", buildTechniqueSchema);

registerFormDialog("technique", buildTechniqueSchema, {
  title: { create: "Thêm kỹ thuật", update: "Cập nhật kỹ thuật" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

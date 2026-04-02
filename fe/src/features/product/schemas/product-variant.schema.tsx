import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/product/api/product.api";
import type { ProductUpsertModel } from "@features/product/model/product.model";
import { categoryProps } from "@root/features/category/utils/category.props";
import { processProps } from "@root/features/process/utils/process.props";

export function buildProductSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "code",
      label: "Mã sản phẩm",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập mã sản phẩm",
        maxLength: 30,
      },
    },
    {
      name: "name",
      label: "Tên sản phẩm",
      kind: "text",
      rules: {
        required: "Yêu cầu nhập tên sản phẩm",
        maxLength: 200,
      },
    },
    {
      name: "retailPrice",
      label: "Giá bán",
      kind: "currency",
      group: "price",
      rules: {
        min: 0,
      },
    },
    {
      name: "costPrice",
      label: "Giá vốn",
      kind: "currency",
      group: "price",
      rules: {
        min: 0,
      },
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product",
        mode: "whole",
        ignoreFields: ["category"],
        def: [
          {
            name: "processIds",
            ...processProps,
          },
          {
            name: "categoryId",
            ...categoryProps,
          },
        ],
        groups: [
          {
            group: "description",
            fields: ["customFields.description"],
          },
          {
            group: "category",
            fields: ["customFields.categoryId"],
          },
          {
            group: "process",
            fields: ["customFields.processIds"],
          },
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        group: "category",
        mode: "whole",
        tag: "catalog",
        groups: [
          {
            group: "category_fields",
          }
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collectionFn: (ctx) => ctx.values.templateId ? `product-${ctx.values.templateId}` : '',
        mode: "whole",
        groups: [
          {
            group: "variant_fields",
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
        label: "Thông tin chung:",
        col: 2,
      },
      {
        name: "variant_fields",
        col: 2,
      },
      {
        name: "description",
        col: 1,
      },
      {
        name: "category",
        label: "Danh mục:",
        col: 1,
      },
      {
        name: "category_fields",
        col: 2,
      },
      {
        name: "price",
        label: "Giá:",
        col: 2,
      },
      {
        name: "process",
        label: "Công đoạn:",
        col: 1,
      },
    ],
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          await create(values as ProductUpsertModel);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          await update(values as ProductUpsertModel);
          return values.dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo sản phẩm "${values?.name ?? ""}" thành công!`
          : `Cập nhật sản phẩm "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo sản phẩm "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật sản phẩm "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data && data.id) {
        return await id(data.id);
      }
      return { ...data };
    },

    async afterSaved() {
      reloadTable("product-variants");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Product", v, "model_to_dto"),
    },
  };
}

registerForm("product-variant", buildProductSchema);

registerFormDialog("product-variant", buildProductSchema, {
  title: { create: "Thêm sản phẩm", update: "Cập nhật sản phẩm" },
  confirmText: { create: "Thêm", update: "Lưu" },
  maxWidth: "lg",
  cancelText: "Thoát",
});

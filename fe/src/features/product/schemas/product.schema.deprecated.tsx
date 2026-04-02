import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/product/api/product.api";
import type { ProductUpsertModel } from "@features/product/model/product.model";
import { processProps } from "@root/features/process/utils/process.props";

export function buildSampleSchema(): FormSchema {
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
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product",
        mode: "whole",
        def: [
          {
            name: "processIds",
            ...processProps,
          }
        ],
        groups: [
          {
            group: "description",
            fields: ["customFields.description"],
          },
          {
            group: "category",
            fields: ["customFields.category"],
          },
          {
            group: "process",
            fields: ["customFields.processIds"],
          },
        ],
      }
    },
    // CATEGORY: CROWN
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-crown",
        mode: "whole",
        groups: [
          {
            group: "crown",
          },
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-crown-full",
        mode: "whole",
        groups: [
          {
            group: "crown",
          },
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-crown-inlay",
        mode: "whole",
        groups: [
          {
            group: "crown",
          }
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-crown-onlay",
        mode: "whole",
        groups: [
          {
            group: "crown",
          }
        ],
      }
    },
    // CATEGORY: DENTURE
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-denture",
        mode: "whole",
        groups: [
          {
            group: "denture",
          },
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-denture-full",
        mode: "whole",
        groups: [
          {
            group: "denture",
          },
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-denture-flex",
        mode: "whole",
        groups: [
          {
            group: "denture",
          },
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-denture-partial",
        mode: "whole",
        groups: [
          {
            group: "denture",
          },
        ],
      }
    },
    // CATEGORY: ALIGNER
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-aligner",
        mode: "whole",
        groups: [
          {
            group: "aligner",
          },
        ],
      }
    },
    // CATEGORY: BRIDGE
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-bridge",
        mode: "whole",
        groups: [
          {
            group: "bridge",
          },
        ],
      }
    },
    // CATEGORY: VENEER
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "product-veneer",
        mode: "whole",
        groups: [
          {
            group: "veneer",
          },
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
        label: "Thông tin chung",
        col: 2,
      },
      {
        name: "description",
        col: 1,
      },
      {
        name: "category",
        label: "Danh mục",
        col: 1,
      },
      {
        name: "crown",
        label: "Loại crown",
        col: 2,
      },
      {
        name: "denture",
        label: "Loại denture",
        col: 2,
      },
      {
        name: "aligner",
        label: "Loại aligner",
        col: 2,
      },
      {
        name: "bridge",
        label: "Loại bridge",
        col: 2,
      },
      {
        name: "veneer",
        label: "Loại veneer",
        col: 2,
      },
      {
        name: "process",
        label: "Công đoạn",
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
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("products");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Product", v, "model_to_dto"),
    },
  };
}

registerForm("product", buildSampleSchema);

registerFormDialog("product", buildSampleSchema, {
  title: { create: "Thêm sản phẩm", update: "Cập nhật sản phẩm" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

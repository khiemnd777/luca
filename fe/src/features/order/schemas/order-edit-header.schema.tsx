import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/order/api/order.api";
import type { OrderUpsertModel } from "@features/order/model/order.model";

export function buildEditOrderSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      kind: "text",
      name: "codeLatest",
      label: "Mã đơn hàng",
      // disableIf: () => true,
      asText: true,
    },
    {
      kind: "text",
      name: "code",
      label: "Mã gốc",
      asText: true,
    },
    {
      kind: "text",
      name: "remakeCount",
      prop: "latestOrderItem",
      label: "Số lần làm lại",
      asText: true,
      showIf: (v) => v["latestOrderItem.remakeCount"] > 0,
    },
    {
      kind: "text",
      name: "customerName",
      label: "Khách hàng",
      asText: true,
    },
    {
      kind: "text",
      name: "productName",
      label: "Sản phẩm",
      group: "product",
      asText: true,
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "order",
        mode: "whole",
        ignoreFields: ["customerId"],
        def: [
          {
            name: "patientName",
            asText: true,
          },
          // {
          //   name: "customerId",
          //   showIf: () => false,
          // },
        ]
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      prop: "latestOrderItem",
      metadata: {
        collection: "order-item",
        mode: "partial",
        fields: ["deliveryDate"],
        groups: [
          {
            group: "general",
            fields: ["deliveryDate"],
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
        col: 2,
      },
    ],
    modeResolver: (_) => {
      return "update";
    },
    submit: {
      create: {
        type: "fn",
        run: async (dto) => {
          await create(dto as OrderUpsertModel);
          return dto;
        },
      },
      update: {
        type: "fn",
        run: async (dto) => {
          await update(dto as OrderUpsertModel);
          return dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo đơn hàng "${values?.name ?? ""}" thành công!`
          : `Cập nhật đơn hàng "${values?.name ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo đơn hàng "${values?.name ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật đơn hàng "${values?.name ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved() {
      reloadTable("orders");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Order", v, "model_to_dto"),
    },
  };
}

registerForm("order-edit-header", buildEditOrderSchema);

registerFormDialog("order-edit-header", buildEditOrderSchema, {
  title: { create: "Tạo đơn hàng mới", update: "Cập nhật đơn hàng" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

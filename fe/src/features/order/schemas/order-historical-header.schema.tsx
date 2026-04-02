import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, update } from "@features/order/api/order.api";
import type { OrderUpsertModel } from "@features/order/model/order.model";

export function buildHistoricalOrderSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      kind: "text",
      name: "latestOrderItem.code",
      label: "Mã đơn hàng",
      // disableIf: () => true,
      asText: true,
    },
    {
      kind: "text",
      name: "latestOrderItem.codeOriginal",
      label: "Mã gốc",
      // disableIf: () => true,
      asText: true,
    },
    {
      kind: "text",
      name: "remakeCount",
      prop: "latestOrderItem",
      label: "Số lần làm lại",
      // disableIf: () => true,
      asText: true,
      showIf: (v) => v["latestOrderItem.remakeCount"] > 0,
    },
    {
      kind: "text",
      name: "customerName",
      label: "Khách hàng",
      // disableIf: () => true,
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
            // disableIf: () => true,
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
      return { ...data };
    },

    async afterSaved() {
      reloadTable("orders");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Order", v, "model_to_dto"),
    },
  };
}

registerForm("order-historical-header", buildHistoricalOrderSchema);

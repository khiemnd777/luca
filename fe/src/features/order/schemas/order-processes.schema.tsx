import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { registerFormDialog } from "@root/core/form/form-dialog.registry";
import type { OrderItemProcessUpsertModel } from "../model/order-item-process.model";
import { update } from "../api/order-item-process.api";
import { invalidate } from "@root/core/hooks/use-async";

export function buildOrderProcessesSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "order-item-process",
        mode: "whole",
        // def: [
        //   {
        //     name: "status",
        //     asText: true,
        //   },
        // ],
      },
    },
  ];

  return {
    idField: "id",
    fields,
    modeResolver: (_) => {
      return "update";
    },
    submit: {
      create: null,
      update: {
        type: "fn",
        run: async (dto) => {
          const payload = dto as OrderItemProcessUpsertModel;
          await update(payload.dto.orderId ?? 0, payload.dto.orderItemId ?? 0, payload.dto.id ?? 0, payload);
          invalidate(`order-processes-board`);
          return dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "update" ? `Cập nhật công đoạn "${values?.processName ?? ""}" thành công!` : "",
      failed: ({ mode, values }) =>
        mode === "update" ? `Cập nhật công đoạn "${values?.processName ?? ""}" thất bại, xin thử lại!` : "",
    },

    async initialResolver(data: any) {
      return data;
    },

    hooks: {
      mapToDto: (v) => mapper.map("Common", v, "model_to_dto"),
    },
  };
}

registerForm("order-processes", buildOrderProcessesSchema);
registerFormDialog("order-processes", buildOrderProcessesSchema, {
  title: { create: "", update: "Cập nhật công đoạn" },
  confirmText: { create: "", update: "Lưu" },
  cancelText: "Thoát",
});

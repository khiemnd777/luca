import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { registerFormDialog } from "@root/core/form/form-dialog.registry";

export function buildOrderProcessStaffSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "assignedName",
      label: "Kỹ thuật viên",
      kind: "text",
      asText: true,
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "order-item-process",
        mode: "whole",
        ignoreFields: ["assignedId"],
        def: [
          {
            name: "note",
            asText: true,
          }
        ],
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
        run: async (_dto) => {

        },
      },
    },
    async initialResolver(data: any) {
      return data;
    },

    hooks: {
      mapToDto: (v) => mapper.map("Common", v, "model_to_dto"),
    },
  };
}

registerForm("order-process-staff", buildOrderProcessStaffSchema);
registerFormDialog("order-process-staff", buildOrderProcessStaffSchema, {
  title: { create: "", update: "Công đoạn" },
  confirmText: { create: "", update: "Lưu" },
  cancelText: "Thoát",
});

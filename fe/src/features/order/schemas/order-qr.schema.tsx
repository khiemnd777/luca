import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";

export function buildOrderCodeSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      kind: "qr",
      name: "qrCode",
      prop: "latestOrderItem",
      label: "Mã QR",
      qr: {
        level: "H",
        size: 200,
      },
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      create: null,
      update: null,
    },

    async initialResolver(data: any) {
      return { ...data };
    },
  };
}

registerForm("order-qr", buildOrderCodeSchema);

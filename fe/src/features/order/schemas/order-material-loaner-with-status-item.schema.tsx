import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { id as fetchMaterialById, search as searchMaterial } from "@features/material/api/material.api";
import type { MaterialModel } from "@features/material/model/material.model";
import { materialDisplayLabel } from "@features/material/utils/material.utils";
import { MATERIAL_STATUSES } from "@root/features/material/utils/material.utils";

function buildOrderLoanerMaterialWithStatusItemSchema(): FormSchema {
  return buildLoanerMaterialWithStatusItemSchema(false, "order-loaner-material", "Vật tư cho mượn");
}

function buildOrderImplantAccessoryWithStatusItemSchema(): FormSchema {
  return buildLoanerMaterialWithStatusItemSchema(true, "order-implant-accessory", "Phụ kiện implant");
}

function buildLoanerMaterialWithStatusItemSchema(isImplant: boolean, listKey: string, materialLabelText: string): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "materialId",
      label: materialLabelText,
      kind: "searchsingle",
      placeholder: `Nhập mã hoặc tên ${materialLabelText.toLowerCase()}`,
      fullWidth: true,
      size: "small",
      group: "line1",
      pageLimit: 50,
      asTextFn(values, _ctx) {
        return values.isCloneable;
      },
      rules: {
        required: "Vui lòng chọn vật tư cho mượn",
      },
      getOptionLabel: (p: MaterialModel) => materialDisplayLabel(p),
      getInputLabel: (p: MaterialModel) => materialDisplayLabel(p),
      async searchPage(keyword: string, page: number, limit: number) {
        const result = await searchMaterial({
          keyword,
          limit,
          page,
          orderBy: "name",
        }, "loaner", isImplant);
        return result.items;
      },
      async hydrateById(idValue: number | string) {
        if (!idValue) return null;
        return await fetchMaterialById(Number(idValue));
      },
      async fetchOne(values: Record<string, any>) {
        const key = values.materialId ?? values.materialCode;
        if (!key) return null;
        if (typeof key === "number") return await fetchMaterialById(key);
        const result = await searchMaterial({
          keyword: String(key),
          limit: 1,
          page: 1,
          orderBy: "name",
        }, "loaner", isImplant);
        return result.items?.[0] ?? null;
      },
      onBlur: (_text: string, matched: any, ctx) => {
        if (!ctx) return;
        const itemId = ctx.values?.id;

        if (!matched) {
          ctx.setValue("materialId", null);
          ctx.setValue("materialCode", "");
          ctx.setValue("materialName", "");
          ctx.setValue("quantity", 1);

          ctx?.emit("item:patch", {
            __meta: {
              listKey,
              itemId,
            },
            patch: {
              materialId: null,
              materialCode: "",
              materialName: "",
              quantity: 1,
            },
          });
          return;
        }

        const material = matched as MaterialModel | null;

        ctx.setValue("materialId", material?.id ?? null);
        ctx.setValue("materialCode", material?.code ?? null);
        ctx.setValue("materialName", material?.name ?? "");
        ctx.setValue("quantity", 1);

        ctx?.emit("item:patch", {
            __meta: {
              listKey,
              itemId,
            },
          patch: {
            materialId: material?.id ?? null,
            materialCode: material?.code ?? null,
            materialName: material?.name ?? "",
            quantity: 1,
          },
        });
      },
    },
    {
      name: "quantity",
      label: "Số lượng",
      kind: "number",
      size: "small",
      group: "line2",
      defaultValue: 1,
      rules: {
        required: "Vui lòng nhập số lượng",
        min: 1,
      },
    },
    {
      name: "status",
      label: "Trang thái",
      kind: "select",
      size: "small",
      group: "line2",
      options: [...MATERIAL_STATUSES],
    },
    {
      name: "note",
      label: "Ghi chú",
      kind: "textarea",
      group: "line3",
    },
  ];

  return {
    idField: "id",
    fields,
    submit: {
      type: "fn",
      run: async (values) => values,
    },
    onChange: (_name, _value, ctx) => {
      const cb = (ctx?.values as any)?.__onChange;
      if (typeof cb === "function") cb(ctx?.values ?? {});
    },
    groups: [
      {
        name: "line1",
        col: 1,
      },
      {
        name: "line2",
        col: 2,
      },
      {
        name: "line3",
        col: 1,
      },
    ],
  };
}

registerForm("order-loaner-material-with-status-item", buildOrderLoanerMaterialWithStatusItemSchema);
registerForm("order-implant-accessory-with-status-item", buildOrderImplantAccessoryWithStatusItemSchema);

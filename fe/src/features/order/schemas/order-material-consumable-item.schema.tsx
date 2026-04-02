import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { id as fetchMaterialById, search as searchMaterial } from "@features/material/api/material.api";
import type { MaterialModel } from "@features/material/model/material.model";

const materialLabel = (p?: MaterialModel | null) => {
  if (!p) return "";
  const code = p.code ?? "";
  const name = p.name ?? "";
  if (code && name) return `${code} → ${name}`;
  return code || name;
};

function buildOrderConsumableMaterialItemSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "materialId",
      label: "Vật tư tiêu hao",
      kind: "searchsingle",
      placeholder: "Nhập mã hoặc tên vật tư tiêu hao",
      fullWidth: true,
      size: "small",
      group: "line1",
      asTextFn(values, _ctx) {
        return values.isCloneable;
      },
      pageLimit: 50,
      rules: {
        required: "Vui lòng chọn vật tư tiêu hao",
      },
      getOptionLabel: (p: MaterialModel) => materialLabel(p),
      getInputLabel: (p: MaterialModel) => p?.code ?? "",
      async searchPage(keyword: string, page: number, limit: number) {
        const result = await searchMaterial({
          keyword,
          limit,
          page,
          orderBy: "code",
        }, "consumable");
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
          orderBy: "code",
        });
        return result.items?.[0] ?? null;
      },
      onBlur: (_text: string, matched: any, ctx) => {
        if (!ctx) return;
        const itemId = ctx.values?.id;

        if (!matched) {
          ctx?.emit("item:patch", {
            __meta: {
              listKey: "order-consumable-material",
              itemId,
            },
            patch: {
              materialId: null,
              materialCode: "",
              quantity: 1,
              retailPrice: 0,
              note: "",
            },
          });
          return;
        }
        const material = matched as MaterialModel | null;

        ctx?.emit("item:patch", {
          __meta: {
            listKey: "order-consumable-material",
            itemId,
          },
          patch: {
            materialId: material?.id ?? null,
            materialCode: material?.code ?? null,
            quantity: 1,
            retailPrice: 0,
            note: "",
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
      name: "retailPrice",
      label: "Giá bán lẻ",
      kind: "currency",
      size: "small",
      group: "line2",
      rules: {
        min: 0,
      },
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

registerForm("order-consumable-material-item", buildOrderConsumableMaterialItemSchema);

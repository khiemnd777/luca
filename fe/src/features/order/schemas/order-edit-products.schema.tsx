import { mapper } from "@core/mapper/auto-mapper";
import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/order/api/order.api";
import type { OrderUpsertModel } from "@features/order/model/order.model";
import { Typography } from "@mui/material";
import { OrderLoanerMaterialItemList } from "../components/order-material-loaner-item-list.component";
import { OrderConsumableMaterialItemList } from "../components/order-material-consumable-item-list.component";
import { OrderProductItemList } from "../components/order-product-item-list.component";
import { prefixCurrency } from "@root/shared/utils/currency.utils";

export function buildEditProductsSchema(): FormSchema {
  const fields: FieldDef[] = [
    // product
    {
      kind: "currency",
      name: "__totalProductPrice",
      prop: "latestOrderItem",
      label: "Tổng cộng:",
      group: "products",
      asText: true,
    },
    {
      kind: "custom",
      prop: "latestOrderItem",
      name: "products",
      label: "Sản phẩm",
      group: "products",
      normalizeInitial: (val, _) => {
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        return arr;
      },
      render: ({ value, setValue, ctx, values }) => (
        <OrderProductItemList
          name="latestOrderItem.products"
          value={value}
          ctx={ctx}
          values={values}
          onChange={setValue}
          onAdd={(item) => console.log("added", item)}
          onRemove={(item) => console.log("removed", item)}
        />
      ),
    },
    // consumable material
    {
      kind: "currency",
      name: "__totalConsumableMaterialPrice",
      prop: "latestOrderItem",
      label: "Tổng cộng:",
      group: "consumable-materials",
      asText: true,
    },
    {
      kind: "custom",
      prop: "latestOrderItem",
      name: "consumableMaterials",
      label: "Vật tư tiêu hao",
      group: "consumable-materials",
      normalizeInitial: (val, _) => {
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        return arr;
      },
      render: ({ value, setValue, ctx, values }) => (
        <OrderConsumableMaterialItemList
          name="latestOrderItem.consumableMaterials"
          value={value}
          ctx={ctx}
          values={values}
          onChange={setValue}
          onAdd={(item) => console.log("added", item)}
          onRemove={(item) => console.log("removed", item)}
        />
      ),
    },
    // loaner material
    {
      kind: "custom",
      prop: "latestOrderItem",
      name: "loanerMaterials",
      label: "Vật tư cho mượn",
      group: "loaner-materials",
      normalizeInitial: (val, _) => {
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        return arr;
      },
      render: ({ value, setValue, ctx, values }) => (
        <OrderLoanerMaterialItemList
          name="latestOrderItem.loanerMaterials"
          frmName="order-loaner-material-with-status-item"
          value={value}
          ctx={ctx}
          values={values}
          onChange={setValue}
          onAdd={(item) => console.log("added", item)}
          onRemove={(item) => console.log("removed", item)}
        />
      ),
    },
    // Total Price
    {
      kind: "custom",
      name: "__totalPrice",
      prop: "latestOrderItem",
      label: "Thành tiền = Sản phẩm - Khuyến mãi",
      group: "total",
      render(ctx) {
        const consumableMaterialPrice = ctx.values["latestOrderItem.__totalConsumableMaterialPrice"] as number;
        const productPrice = ctx.values["latestOrderItem.__totalProductPrice"] as number;
        if (!Number.isFinite(consumableMaterialPrice) || !Number.isFinite(productPrice)) {
          return (
            <Typography>
              Thành tiền = Sản phẩm - Khuyến mãi: —
            </Typography>
          );
        }

        const total = Number(consumableMaterialPrice) + Number(productPrice);
        return (
          <Typography>
            Thành tiền = Sản phẩm - Khuyến mãi: {prefixCurrency} {total.toLocaleString()}
          </Typography>
        );
      },
    },
  ];

  return {
    idField: "id",
    fields,
    groups: [
      {
        name: "remake",
        label: "Làm lại:",
        col: 1,
      },
      {
        name: "status",
        col: 2,
      },
      {
        name: "note",
        col: 1,
      },
      {
        name: "products",
        label: "Danh sách sản phẩm:",
        col: 1,
      },
      {
        name: "consumable-materials",
        label: "Danh sách vật tư tiêu hao:",
        col: 1,
      },
      {
        name: "loaner-materials",
        label: "Danh sách vật tư cho mượn:",
        col: 1,
      },
      {
        name: "total",
        label: "Thành tiền:",
        col: 1,
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

registerForm("order-edit-products", buildEditProductsSchema);

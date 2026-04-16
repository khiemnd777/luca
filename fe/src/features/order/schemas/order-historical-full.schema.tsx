import { mapper } from "@core/mapper/auto-mapper";
import type { CustomRenderCtx, FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, update } from "@features/order/api/order.api";
import type { OrderUpsertModel } from "@features/order/model/order.model";
import { OrderLoanerMaterialItemList } from "../components/order-material-loaner-item-list.component";
import { OrderProductItemList } from "../components/order-product-item-list.component";
import { normalizeOrderPaymentFlags } from "./payment-flags";
import { TotalPriceWithPromotionV2 } from "../components/order-total-price-with-promotion.component";

export function buildHistoricalOrderSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      kind: "text",
      name: "latestOrderItem.code",
      section: "order_info",
      label: "Mã đơn hàng",
      asText: true,
    },
    {
      kind: "text",
      name: "latestOrderItem.codeOriginal",
      section: "order_info",
      label: "Mã gốc",
      asText: true,
      showIf: (v) => v["latestOrderItem.remakeCount"] > 0,
    },
    {
      kind: "text",
      name: "remakeCount",
      prop: "latestOrderItem",
      section: "order_info",
      label: "Số lần làm lại",
      asText: true,
      showIf: (v) => v["latestOrderItem.remakeCount"] > 0,
    },
    {
      kind: "text",
      name: "clinicName",
      section: "participants",
      label: "Nha sĩ",
      asText: true,
    },
    {
      kind: "text",
      name: "dentistName",
      section: "participants",
      label: "Nha sĩ",
      asText: true,
    },
    {
      kind: "text",
      name: "patientName",
      section: "participants",
      label: "Bệnh nhân",
      asText: true,
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "order",
        mode: "whole",
        groups: [
          {
            group: "general",
            section: "participants",
            fields: ["clinicId", "dentistId", "patientId", "refUserId"],
          },
        ],
        ignoreFields: ["clinicId", "dentistId", "patientId"],
        def: [
          // {
          //   name: "patientName",
          //   // disableIf: () => true,
          //   asText: true,
          // },
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
        collection: "order-item-product",
        mode: "whole",
        groups: [
          {
            group: "product",
          }
        ],
        ignoreFields: ["productId"],
        def: [
          {
            name: "productCategory",
            showIf: () => false,
          }
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      prop: "latestOrderItem",
      metadata: {
        collection: "order-item-tooth",
        mode: "whole",
        groups: [
          {
            group: "product",
          }
        ],
        def: [
          {
            name: "toothPositions",
            disableIf: () => true,
          }
        ],
      }
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      prop: "latestOrderItem",
      metadata: {
        collection: "order-item-remake",
        mode: "whole",
        groups: [
          {
            group: "remake",
          }
        ],
      }
    },
    {
      kind: "switch",
      name: "isCredit",
      prop: "latestOrderItem",
      label: "Công nợ",
      group: "total",
    },
    {
      name: "",
      label: "",
      kind: "metadata",
      prop: "latestOrderItem",
      metadata: {
        collection: "order-item",
        mode: "whole",
        ignoreFields: ["isCash", "isCredit", "retailPrice", "quantity", "vat", "discountPrice", "totalPrice"],
        groups: [
          {
            group: "general",
            section: "order_info",
            fields: ["deliveryDate"],
          },
          {
            group: "general",
            section: "status",
            fields: ["status", "priority"],
          },
          {
            group: "general",
            section: "note",
            fields: ["note"],
          },
        ],
      }
    },
    // product
    {
      kind: "currency",
      name: "__totalProductPrice",
      prop: "latestOrderItem",
      label: "Tổng cộng:",
      group: "products",
      asText: true,
      showIf: () => false,
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
      showIf: () => false,
    },
    // {
    //   kind: "custom",
    //   prop: "latestOrderItem",
    //   name: "consumableMaterials",
    //   label: "Vật tư tiêu hao",
    //   group: "consumable-materials",
    //   normalizeInitial: (val, _) => {
    //     const arr = Array.isArray(val) ? val : val ? [val] : [];
    //     return arr;
    //   },
    //   render: ({ value, setValue, ctx, values }) => (
    //     <OrderConsumableMaterialItemList
    //       name="latestOrderItem.consumableMaterials"
    //       value={value}
    //       ctx={ctx}
    //       values={values}
    //       onChange={setValue}
    //       onAdd={(item) => console.log("added", item)}
    //       onRemove={(item) => console.log("removed", item)}
    //     />
    //   ),
    // },
    // -- loaner material
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
    {
      kind: "custom",
      prop: "latestOrderItem",
      name: "implantAccessories",
      label: "Phụ kiện implant kèm theo",
      group: "implant-accessories",
      normalizeInitial: (val, _) => {
        const arr = Array.isArray(val) ? val : val ? [val] : [];
        return arr;
      },
      render: ({ value, setValue, ctx, values }) => (
        <OrderLoanerMaterialItemList
          name="latestOrderItem.implantAccessories"
          frmName="order-implant-accessory-with-status-item"
          variant="implant"
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
      render({ values, ctx }: CustomRenderCtx) {
        return (
          <TotalPriceWithPromotionV2
            values={values}
            formCtx={ctx}
          />
        );
      },
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
        sections: [
          {
            name: "order_info",
            label: "Thông tin đơn hàng",
            col: 2,
          },
          {
            name: "participants",
            label: "Khách hàng",
            col: 2,
          },
          {
            name: "status",
            label: "Trạng thái đơn hàng",
            col: 2,
          },
          {
            name: "note",
            label: "Ghi chú",
            col: 1,
          },
        ],
      },
      {
        name: "remake",
        col: 1,
      },
      {
        name: "products",
        label: "Danh sách sản phẩm:",
        col: 1,
      },
      // {
      //   name: "consumable-materials",
      //   label: "Danh sách vật tư tiêu hao:",
      //   col: 1,
      // },
      {
        name: "loaner-materials",
        label: "Danh sách vật tư cho mượn:",
        col: 1,
      },
      {
        name: "implant-accessories",
        label: "Danh sách phụ kiện implant kèm theo:",
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
      return { ...data };
    },

    async afterSaved() {
      reloadTable("orders");
    },

    hooks: {
      mapToDto: (v) => mapper.map("Order", normalizeOrderPaymentFlags(v), "model_to_dto"),
    },
  };
}

registerForm("order-historical", buildHistoricalOrderSchema);

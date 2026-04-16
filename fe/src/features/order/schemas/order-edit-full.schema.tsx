import { mapper } from "@core/mapper/auto-mapper";
import type { CustomRenderCtx, FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@features/order/api/order.api";
import type { OrderUpsertModel } from "@features/order/model/order.model";
import { OrderProductItemList } from "../components/order-product-item-list.component";
import { OrderLoanerMaterialItemList } from "../components/order-material-loaner-item-list.component";
import { list as listPromotions } from "@features/promotion/api/promotion-admin.api";
import PromotionValidateButton from "../components/order-promotion-validate-button.component";
import { normalizeOrderPaymentFlags } from "./payment-flags";
import { TotalPriceWithPromotionV2 } from "../components/order-total-price-with-promotion.component";

export function buildEditOrderSchema(): FormSchema {
  let previousClinicId: string | number | null = null;

  const fields: FieldDef[] = [
    // Mã đơn hàng
    {
      kind: "text",
      name: "codeLatest",
      section: "order_info",
      label: "Mã đơn hàng",
      asText: true,
    },
    // Mã gốc
    {
      kind: "text",
      name: "code",
      section: "order_info",
      label: "Mã gốc",
      asText: true,
      showIf: (v) => v["latestOrderItem.remakeCount"] > 0,
    },
    // Số lần làm lại
    {
      kind: "text",
      name: "remakeCount",
      prop: "latestOrderItem",
      section: "order_info",
      label: "Số lần làm lại",
      asText: true,
      showIf: (v) => v["latestOrderItem.remakeCount"] > 0,
    },
    // // Nha khoa
    // {
    //   kind: "text",
    //   name: "clinicName",
    //   label: "Nha khoa",
    //   asText: true,
    // },
    // // Nha sĩ
    // {
    //   kind: "text",
    //   name: "dentistName",
    //   label: "Nha sĩ",
    //   asText: true,
    // },
    // // Bệnh nhân
    // {
    //   kind: "text",
    //   name: "patientName",
    //   label: "Bệnh nhân",
    //   asText: true,
    // },
    // Mã khuyến mãi
    {
      kind: "searchsingle",
      name: "promotionCode",
      label: "Mã khuyến mãi",
      placeholder: "Nhập mã khuyến mãi",
      fullWidth: true,
      group: "promotion",
      size: "small",
      pageLimit: 20,
      allowUnmatched: true,
      getOptionLabel: (item: any) => item?.code ?? "",
      getInputLabel: (item: any) => item?.code ?? "",
      getOptionValue: (item: any) => item?.code ?? "",
      renderItem: (item: any) => (<>{item?.code}</>),
      async searchPage(keyword: string, page: number, limit: number) {
        const result = await listPromotions({
          limit,
          page: Math.max(page - 1, 0),
          orderBy: "code",
          direction: "asc",
          keyword,
        } as any);
        const items = result.items ?? [];
        if (!keyword) return items;
        const lower = keyword.toLowerCase();
        return items.filter((item) => (item?.code ?? "").toLowerCase().includes(lower));
      },
      async hydrateById(idValue: number | string) {
        if (!idValue) return null;
        const keyword = String(idValue);
        const result = await listPromotions({
          limit: 10,
          page: 0,
          orderBy: "code",
          direction: "asc",
          keyword,
        } as any);
        const items = result.items ?? [];
        return items.find((item) => (item?.code ?? "").toLowerCase() === keyword.toLowerCase()) ?? null;
      },
      async fetchOne(values: Record<string, any>) {
        const code = values.promotionCode;
        if (!code) return null;
        const keyword = String(code);
        const result = await listPromotions({
          limit: 10,
          page: 0,
          orderBy: "code",
          direction: "asc",
          keyword,
        } as any);
        const items = result.items ?? [];
        return items.find((item) => (item?.code ?? "").toLowerCase() === keyword.toLowerCase()) ?? null;
      },
      onBlur: (text, matched, ctx) => {
        if (!ctx) return;
        const code = matched?.code ?? text;
        ctx.setValue("promotionCode", code || null);
        ctx.setValue("promotionCodeId", matched?.id ?? null);
      },
    },
    // Nút xác thực khuyến mãi
    {
      kind: "custom",
      name: "__promotionValidate",
      label: "Xác thực khuyến mãi",
      group: "promotion",
      render: ({ values, ctx }: CustomRenderCtx) => {
        return <PromotionValidateButton values={values} ctx={ctx} />
      },
    },
    // Metadata: Order basic info
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
        def: [
          {
            name: "clinicId",
            onBlur: (_text, matched, ctx) => {
              const nextClinicId = matched?.id ?? null;
              const changed = String(previousClinicId ?? "") !== String(nextClinicId ?? "");
              previousClinicId = nextClinicId;

              if (!changed || !ctx) return;

              ctx.setValue("relationFields.clinicId", null);
              ctx.setValue("clinicId", null);
              ctx.setValue("customFields.clinicId", null);

              ctx.setValue("relationFields.dentistId", null);
              ctx.setValue("dentistId", null);
              ctx.setValue("customFields.dentistId", null);

              ctx.setValue("relationFields.patientId", null);
              ctx.setValue("patientId", null);
              ctx.setValue("customFields.patientId", null);
            },
            validate: (input) => (input?.trim() ? null : "Không để trống nha khoa"),
          },
          {
            name: "dentistId",
            onBlur: (_text, matched, ctx) => {
              if (matched || !ctx) return;
              ctx.setValue("relationFields.dentistId", null);
              ctx.setValue("dentistId", null);
              ctx.setValue("customFields.dentistId", null);
            },
            where: (values, _ctx) => {
              const clinicId = values["relationFields.clinicId"] ?? values["clinicId"];
              if (!clinicId) return [];
              return [`clinic_id=${clinicId}`];
            },
            validate: (input) => (input?.trim() ? null : "Không để trống nha sĩ"),
          },
          {
            name: "patientId",
            onBlur: (_text, matched, ctx) => {
              if (matched || !ctx) return;
              ctx.setValue("relationFields.patientId", null);
              ctx.setValue("patientId", null);
              ctx.setValue("customFields.patientId", null);
            },
            where: (values, _ctx) => {
              const clinicId = values["relationFields.clinicId"] ?? values["clinicId"];
              if (!clinicId) return [];
              return [`clinic_id=${clinicId}`];
            },
            validate: (input) => (input?.trim() ? null : "Không để trống bệnh nhân"),
          },
        ],
      }
    },
    // Metadata: product category
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
    // Metadata: tooth position
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
            asText: true,
          }
        ],
      }
    },
    // Metadata: remake
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
    // Công nợ
    {
      kind: "switch",
      name: "isCredit",
      prop: "latestOrderItem",
      label: "Công nợ",
      group: "total",
    },
    // Tiền mặt
    {
      name: "",
      label: "",
      kind: "metadata",
      prop: "latestOrderItem",
      metadata: {
        collection: "order-item",
        mode: "whole",
        ignoreFields: ["retailPrice", "quantity", "vat", "discountPrice", "totalPrice"],
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
        def: [
          {
            name: "priority",
            rules: { required: "Không để trống ưu tiên" },
          },
          {
            name: "status",
            rules: { required: "Không để trống trạng thái" },
          },
          {
            name: "deliveryDate",
            rules: { required: "Không để trống ngày giao" },
          },
        ],
      }
    },
    // Total Product Price
    {
      kind: "currency",
      name: "__totalProductPrice",
      prop: "latestOrderItem",
      label: "Tổng cộng:",
      group: "products",
      asText: true,
      showIf: () => false,
    },
    // Product List
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
    // Consumable material
    // {
    //   kind: "currency",
    //   name: "__totalConsumableMaterialPrice",
    //   prop: "latestOrderItem",
    //   label: "Tổng cộng:",
    //   group: "consumable-materials",
    //   asText: true,
    // },
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
    // Loaner material
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
        name: "promotion",
        label: "Khuyến mãi:",
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
          const model = dto as OrderUpsertModel;
          await update(model);
          return dto;
        },
      },
    },

    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo đơn hàng "${values?.codeLatest ?? ""}" thành công!`
          : `Cập nhật đơn hàng "${values?.codeLatest ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo đơn hàng "${values?.codeLatest ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật đơn hàng "${values?.codeLatest ?? ""}" thất bại, xin thử lại!`,
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
      mapToDto: (v) => mapper.map("Order", normalizeOrderPaymentFlags(v), "model_to_dto"),
    },
  };
}

registerForm("order-edit", buildEditOrderSchema);

registerFormDialog("order-edit", buildEditOrderSchema, {
  title: { create: "Tạo đơn hàng mới", update: "Cập nhật đơn hàng" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

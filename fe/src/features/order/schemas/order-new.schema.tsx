import { mapper } from "@core/mapper/auto-mapper";
import type { CustomRenderCtx, FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, getOrReserveOrderCode, id, prepareForRemakeByOrderID, search, update } from "@features/order/api/order.api";
import type { OrderUpsertModel } from "@features/order/model/order.model";
import { list as listPromotions } from "@features/promotion/api/promotion-admin.api";
import { alphabetSeq } from "@root/shared/utils/string.utils";
import { OrderProductItemList } from "../components/order-product-item-list.component";
import { OrderLoanerMaterialItemList } from "../components/order-material-loaner-item-list.component";
import PromotionValidateButton from "../components/order-promotion-validate-button.component";
import { normalizeOrderPaymentFlags } from "./payment-flags";
import { TotalPriceWithPromotionV2 } from "../components/order-total-price-with-promotion.component";
import {
  OrderPrescriptionFilesSection,
  applyCreatedOrderToPrescriptionScope,
} from "../components/order-prescription-files-section.component";
import { syncDeferredPrescriptionFiles } from "../utils/order-prescription-file.sync";

export function buildNewOrderSchema(): FormSchema {
  let previousClinicId: string | number | null = null;

  const fields: FieldDef[] = [
    // Mã đơn hàng
    {
      kind: "searchsingle",
      name: "code",
      allowUnmatched: true,
      label: "Mã đơn hàng",
      placeholder: "Nhập mã đơn hàng",
      fullWidth: true,
      validate: (input) => (input?.trim() ? null : "Trường này là bắt buộc"),
      pageLimit: 20,
      resolveDefaultInput: async (_values, ctx) => {
        if (!ctx?.formSessionId) {
          return null;
        }
        const result = await getOrReserveOrderCode(ctx.formSessionId);
        ctx.setValue("code", result.orderCode);
        return {
          inputValue: result.orderCode,
          value: null,
        };
      },
      onBlur: async (text, matched, ctx) => {
        ctx?.setValue("code", text);
        if (matched) {
          const vid = matched.id;
          const result = await prepareForRemakeByOrderID(vid);
          if (result.latestOrderItem) {
            const seq = result.latestOrderItem.remakeCount + 1;
            result.latestOrderItem.remakeCount = seq;
            result.latestOrderItem.code = `${alphabetSeq(seq)}${matched.code}`;

            ctx?.setInitial(result);
          }
        } else {
          ctx?.setInitial({ code: text });
        }
      },

      getOptionLabel: (d: any) => d?.code,
      getOptionValue: (d: any) => d?.code,

      async searchPage(kw: string, page, limit) {
        const searched = await search({
          keyword: kw,
          limit: limit,
          page: page,
          orderBy: "code",
        });
        return searched.items;
      },


      async hydrateById(idValue: number | string, _) {
        if (!idValue) return null;
        const single = await id(idValue as number);
        return single ?? null;
      },
      async fetchOne(values: Record<string, any>) {
        const rawId = values.code;
        if (!rawId) return null;
        const single = await id(rawId);
        return single ?? null;
      },

      renderItem: (d: any) => (<>{d?.code}</>),
      disableDelete: (d: any) => d?.locked === true,
      autoLoadAllOnMount: true,
    },
    // Mã đơn làm lại
    {
      name: "code",
      prop: "latestOrderItem",
      kind: "text",
      label: "Mã đơn làm lại",
      showIf: (values) => values["latestOrderItem.remakeCount"] > 0,
    },
    // Số lần làm lại
    {
      name: "remakeCount",
      prop: "latestOrderItem",
      kind: "text",
      label: "Số lần làm lại",
      showIf: (values) => values["latestOrderItem.remakeCount"] > 0,
      disableIf: (_) => true,
    },
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
    // Metadata: Order basic info and clinicId, dentistId, patientId
    {
      name: "",
      label: "",
      kind: "metadata",
      metadata: {
        collection: "order",
        mode: "whole",
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
          {
            name: "refUserId",
            onBlur: (_text, matched, ctx) => {
              if (matched || !ctx) return;
              ctx.setValue("relationFields.refUserId", null);
              ctx.setValue("refUserId", null);
              ctx.setValue("customFields.refUserId", null);
            },
          },
        ],
      }
    },
    // {
    //   name: "",
    //   label: "",
    //   kind: "metadata",
    //   prop: "latestOrderItem",
    //   metadata: {
    //     collection: "order-item-product",
    //     mode: "whole",
    //     groups: [
    //       {
    //         group: "product",
    //       }
    //     ],
    //     def: [
    //       {
    //         name: "productId",
    //         onBlur: async (text, matched, ctx) => {
    //           console.log(text, matched, ctx);
    //           if (matched) {
    //             const result: ProductModel = await rel1("order-product", matched.id);
    //             console.log(result);
    //             // don't need assign to productId and productName, because they are handled during submitting.
    //             // ctx?.setValue("latestOrderItem.customFields.productId", result.id);
    //             // ctx?.setValue("latestOrderItem.customFields.productName", result.name);
    //             ctx?.setValue("latestOrderItem.customFields.", result.id);
    //             if (result.customFields) {
    //               ctx?.setValue("latestOrderItem.customFields.vat", result.customFields.vat);
    //               ctx?.setValue("latestOrderItem.customFields.productCategory", result.customFields.category);
    //               ctx?.setValue("latestOrderItem.customFields.retailPrice", result.customFields.retailPrice);
    //             }
    //           }
    //         },
    //       },
    //       {
    //         name: "productCategory",
    //         disableIf: () => true,
    //       }
    //     ],
    //   }
    // },

    // Metadata: product, remake, note, priority, status
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
          },
        ]
      }
    },
    // Metadata: remake reason
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
        ignoreFields: ["status", "isCash", "isCredit", "retailPrice", "quantity", "vat", "discountPrice", "totalPrice"],
        groups: [
          {
            group: "status",
            fields: ["priority"],
          },
          {
            group: "note",
            fields: ["note"],
          },
        ],
        def: [
          {
            name: "priority",
            rules: { required: "Không để trống ưu tiên" },
          },
          {
            name: "deliveryDate",
            rules: { required: "Không để trống ngày giao" },
          },
        ],
      }
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
          frmName="order-loaner-material-item"
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
      name: "__prescriptionFiles",
      label: "Phiếu chỉ định",
      group: "prescription-files",
      fullWidth: true,
      render: ({ values, ctx }) => {
        const scopeKey = String(values.__prescriptionFilesScopeKey ?? ctx?.formSessionId ?? "order-new");
        if (ctx && values.__prescriptionFilesScopeKey !== scopeKey) {
          ctx.setValue("__prescriptionFilesScopeKey", scopeKey);
        }

        return (
          <OrderPrescriptionFilesSection
            mode="deferred"
            scopeKey={scopeKey}
            orderId={typeof values.id === "number" ? values.id : undefined}
            canMutate
            setOrderValues={(patch) => {
              if (!ctx) return;
              Object.entries(patch).forEach(([key, value]) => ctx.setValue(key, value));
            }}
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
      },
      {
        name: "note",
        col: 1,
      },
      {
        name: "status",
        label: "Trạng thái đơn hàng:",
        col: 2,
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
        name: "total",
        label: "Thành tiền:",
        col: 1,
      },
      {
        name: "prescription-files",
        label: "Phiếu chỉ định:",
        col: 1,
      },
    ],
    modeResolver: (_) => {
      return "create";
    },
    submit: {
      create: {
        type: "fn",
        run: async (dto) => {
          const scopeKey = String((dto as any).__prescriptionFilesScopeKey ?? "");
          const model = dto as OrderUpsertModel;
          const hasExistingOrder = typeof model.dto?.id === "number" && model.dto.id > 0;

          const result = hasExistingOrder
            ? await update(model).then(() => id(model.dto.id))
            : await create(model);

          if (scopeKey && result?.id) {
            applyCreatedOrderToPrescriptionScope(scopeKey, {
              id: result.id,
              code: result.code,
              codeLatest: result.codeLatest,
            });
            await syncDeferredPrescriptionFiles(scopeKey, result.id);
          }

          return result;
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
          ? `Tạo đơn hàng "${values?.codeLatest ?? values?.code ?? ""}" thành công!`
          : `Cập nhật đơn hàng "${values?.codeLatest ?? values?.code ?? ""}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo đơn hàng "${values?.codeLatest ?? values?.code ?? ""}" thất bại, xin thử lại!`
          : `Cập nhật đơn hàng "${values?.codeLatest ?? values?.code ?? ""}" thất bại, xin thử lại!`,
    },

    async initialResolver(data: any) {
      if (data) {
        return await id(data.id);
      }
      return {};
    },

    async afterSaved(_, _ctx) {
      reloadTable("orders");
    },

    hooks: {
      mapToDto: (v) => ({
        ...mapper.map("Order", normalizeOrderPaymentFlags(v), "model_to_dto"),
        __prescriptionFilesScopeKey: v.__prescriptionFilesScopeKey,
      }),
    },
  };
}

registerForm("order-new", buildNewOrderSchema);

registerFormDialog("order-new", buildNewOrderSchema, {
  title: { create: "Tạo đơn hàng mới", update: "Cập nhật đơn hàng" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

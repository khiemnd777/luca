import { mapper } from "@core/mapper/auto-mapper";
import type { CustomRenderCtx, FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { create, prepareForRemakeByOrderID, update } from "@features/order/api/order.api";
import type { OrderUpsertModel } from "@features/order/model/order.model";
import { alphabetSeq } from "@root/shared/utils/string.utils";
import { OrderProductItemList } from "../components/order-product-item-list.component";
import { OrderConsumableMaterialItemList } from "../components/order-material-consumable-item-list.component";
import { OrderLoanerMaterialItemList } from "../components/order-material-loaner-item-list.component";
import { navigate } from "@root/core/navigation/navigate";
import { list as listPromotions } from "@features/promotion/api/promotion-admin.api";
import PromotionValidateButton from "../components/order-promotion-validate-button.component";
import { TotalPriceWithPromotionV2 } from "../components/order-total-price-with-promotion.component";
import {
  OrderPrescriptionFilesSection,
  applyCreatedOrderToPrescriptionScope,
} from "../components/order-prescription-files-section.component";
import { syncDeferredPrescriptionFiles } from "../utils/order-prescription-file.sync";

export function buildRemakeOrderSchema(): FormSchema {
  let previousClinicId: string | number | null = null;

  const fields: FieldDef[] = [
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
    // Xác thực khuyến mãi
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
    
    // Metadata: OrderItem info
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
    // Metadata: Remake info
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
    // Metadata: Note and priority for remake order item
    {
      name: "",
      label: "",
      kind: "metadata",
      prop: "latestOrderItem",
      metadata: {
        collection: "order-item",
        mode: "whole",
        ignoreFields: ["status", "retailPrice", "quantity", "vat", "discountPrice", "totalPrice"],
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
    // Tổng cộng sản phẩm (chưa trừ khuyến mãi)
    {
      kind: "currency",
      name: "__totalProductPrice",
      prop: "latestOrderItem",
      label: "Tổng cộng:",
      group: "products",
      asText: true,
      showIf: () => false,
    },
    // Product list
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
    {
      kind: "currency",
      name: "__totalConsumableMaterialPrice",
      prop: "latestOrderItem",
      label: "Tổng cộng:",
      group: "consumable-materials",
      asText: true,
      showIf: () => false,
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
          frmName="order-implant-accessory-item"
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
    {
      kind: "custom",
      name: "__prescriptionFiles",
      label: "Phiếu chỉ định",
      group: "prescription-files",
      fullWidth: true,
      render: ({ values, ctx }) => {
        const scopeKey = String(values.__prescriptionFilesScopeKey ?? ctx?.formSessionId ?? "order-remake");
        if (ctx && values.__prescriptionFilesScopeKey !== scopeKey) {
          ctx.setValue("__prescriptionFilesScopeKey", scopeKey);
        }

        return (
          <OrderPrescriptionFilesSection
            mode="deferred"
            scopeKey={scopeKey}
            orderId={undefined}
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
        name: "implant-accessories",
        label: "Danh sách phụ kiện implant kèm theo:",
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
          const result = await create(dto as OrderUpsertModel);
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
          console.log(dto);
          await update(dto as OrderUpsertModel);
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
        const result = await prepareForRemakeByOrderID(data.id);
        if (result.latestOrderItem) {
          const seq = result.latestOrderItem.remakeCount + 1;
          result.latestOrderItem.remakeCount = seq;
          result.latestOrderItem.code = `${alphabetSeq(seq)}${result.code}`;
        }
        return result;
      }
      return {};
    },

    async afterSaved(result, _ctx) {
      navigate(`/order/${result.latestOrderItem.orderId}/historical/${result.latestOrderItem.id}`);
    },

    hooks: {
      mapToDto: (v) => ({
        ...mapper.map("Order", v, "model_to_dto"),
        __prescriptionFilesScopeKey:
          typeof v?.dto?.__prescription_files_scope_key === "string"
            ? v.dto.__prescription_files_scope_key
            : undefined,
      }),
    },
  };
}

registerForm("order-remake", buildRemakeOrderSchema);

registerFormDialog("order-remake", buildRemakeOrderSchema, {
  title: { create: "Tạo đơn hàng làm lại", update: "" },
  confirmText: { create: "Thêm", update: "Lưu" },
  cancelText: "Thoát",
});

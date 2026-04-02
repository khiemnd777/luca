import type { FieldDef } from "@core/form/types";
import type { FormSchema, GroupConfig } from "@core/form/form.types";
import { registerFormDialog } from "@core/form/form-dialog.registry";
import { registerForm } from "@core/form/form-registry";
import { reloadTable } from "@core/table/table-reload";
import { create, id, update } from "@root/features/promotion/api/promotion-admin.api";
import { search as searchCategory, id as fetchCategoryById } from "@features/category/api/category.api";
import type { CategoryModel } from "@features/category/model/category.model";
import { search as searchProduct, id as fetchProductById } from "@features/product/api/product.api";
import type { ProductModel } from "@features/product/model/product.model";
import { search as searchCustomer, id as fetchCustomerById } from "@features/customer/api/customer.api";
import type { CustomerModel } from "@features/customer/model/customer.model";
import type {
  CreatePromotionInputModel,
  UpdatePromotionInputModel,
} from "@features/promotion/model/promotion.model";
import {
  PROMOTION_CONDITIONS,
  PROMOTION_DISCOUNT_TYPES,
  PROMOTION_SCOPES,
} from "@features/promotion/model/promotion.const";

const promotionGroups: GroupConfig[] = [
  { 
    name: "general", 
    label: "Thông tin chung",
  },
  { 
    name: "scope",
    label: "Phạm vi áp dụng",
  },
  { 
    name: "condition",
    label: "Điều kiện",
  },
  { 
    name: "timing",
    label: "Thời gian",
  },
];

const parseDateTime = (value: any): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const validateStartAt = async (value: any, values: Record<string, any>) => {
  const start = parseDateTime(value);
  const end = parseDateTime(values.endAt);

  if (value && start == null) return "Ngày bắt đầu không hợp lệ";
  if (values.endAt && end == null) return "Ngày kết thúc không hợp lệ";
  if (start != null && end != null && start > end)
    return "Ngày bắt đầu phải trước ngày kết thúc";

  return null;
};

const validateEndAt = async (value: any, values: Record<string, any>) => {
  const start = parseDateTime(values.startAt);
  const end = parseDateTime(value);

  if (value && end == null) return "Ngày kết thúc không hợp lệ";
  if (values.startAt && start == null) return "Ngày bắt đầu không hợp lệ";
  if (start != null && end != null && end < start)
    return "Ngày kết thúc phải sau ngày bắt đầu";

  return null;
};

const promotionLabel = (values: any) =>
  values?.dto?.code ?? values?.code ?? "";

const categoryLabel = (c?: CategoryModel | null) => {
  if (!c) return "";
  const code = c.code ?? "";
  const name = c.name ?? "";
  if (code && name) return `${code} → ${name}`;
  return code || name;
};

const productLabel = (p?: ProductModel | null) => {
  if (!p) return "";
  const code = p.code ?? "";
  const name = p.name ?? "";
  if (code && name) return `${code} → ${name}`;
  return code || name;
};

const customerLabel = (c?: CustomerModel | null) => {
  if (!c) return "";
  const code = c.code ?? "";
  const name = c.name ?? "";
  if (code && name) return `${code} → ${name}`;
  return code || name;
};

const hasCondition = (values: Record<string, any>, type: string) =>
  Array.isArray(values.conditionTypes) && values.conditionTypes.includes(type);

export function buildPromotionSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "code",
      label: "Mã khuyến mãi",
      kind: "text",
      group: "general",
      rules: {
        required: "Yêu cầu nhập mã khuyến mãi",
        maxLength: 50,
      },
    },
    {
      name: "name",
      label: "Tên khuyến mãi",
      kind: "text",
      group: "general",
      rules: {
        maxLength: 200,
      },
    },
    {
      name: "discountType",
      label: "Loại giảm",
      kind: "select",
      group: "general",
      options: [...PROMOTION_DISCOUNT_TYPES],
      rules: {
        required: "Yêu cầu nhập loại giảm",
      },
    },
    {
      name: "discountValue",
      label: "Giá trị giảm",
      kind: "number",
      group: "general",
      rules: {
        required: "Yêu cầu nhập giá trị giảm",
        min: 0,
      },
      step: 1,
    },
    {
      name: "maxDiscountAmount",
      label: "Giảm tối đa",
      kind: "number",
      group: "general",
      rules: {
        min: 0,
      },
      step: 1,
    },
    {
      name: "minOrderValue",
      label: "Giá trị đơn hàng tối thiểu",
      kind: "number",
      group: "general",
      rules: {
        min: 0,
      },
      step: 1,
    },
    {
      name: "totalUsageLimit",
      label: "Giới hạn sử dụng",
      kind: "number",
      group: "general",
      rules: {
        min: 0,
      },
      step: 1,
    },
    {
      name: "usagePerUser",
      label: "Giới hạn mỗi khách hàng",
      kind: "number",
      group: "general",
      rules: {
        min: 0,
      },
      step: 1,
    },
    {
      name: "scopeType",
      label: "Phạm vi áp dụng",
      kind: "select",
      group: "scope",
      options: [...PROMOTION_SCOPES],
      defaultValue: "ALL",
      rules: {
        required: "Yêu cầu chọn phạm vi áp dụng",
      },
    },
    {
      name: "scopeCategoryIds",
      label: "Danh mục áp dụng",
      kind: "searchlist",
      group: "scope",
      placeholder: "Tìm danh mục áp dụng",
      fullWidth: true,
      pageLimit: 50,
      showIf: (values) => values.scopeType === "CATEGORY",
      getOptionLabel: (c: CategoryModel) => categoryLabel(c),
      getOptionValue: (c: CategoryModel) => c?.id,
      async searchPage(keyword: string, page: number, limit: number) {
        const result = await searchCategory({
          keyword,
          limit,
          page,
          orderBy: "code",
        });
        return result.items;
      },
      async hydrateByIds(ids: Array<number | string>) {
        if (!ids || ids.length === 0) return [];
        const items = await Promise.all(
          ids.map((idValue) => fetchCategoryById(Number(idValue)))
        );
        return items.filter(Boolean);
      },
    },
    {
      name: "scopeProductIds",
      label: "Sản phẩm áp dụng",
      kind: "searchlist",
      group: "scope",
      placeholder: "Tìm sản phẩm áp dụng",
      fullWidth: true,
      pageLimit: 50,
      showIf: (values) => values.scopeType === "PRODUCT",
      getOptionLabel: (p: ProductModel) => productLabel(p),
      getOptionValue: (p: ProductModel) => p?.id,
      async searchPage(keyword: string, page: number, limit: number) {
        const result = await searchProduct({
          keyword,
          limit,
          page,
          orderBy: "code",
        });
        return result.items;
      },
      async hydrateByIds(ids: Array<number | string>) {
        if (!ids || ids.length === 0) return [];
        const items = await Promise.all(
          ids.map((idValue) => fetchProductById(Number(idValue)))
        );
        return items.filter(Boolean);
      },
    },
    {
      name: "scopeUserIds",
      label: "Khách hàng áp dụng",
      kind: "searchlist",
      group: "scope",
      placeholder: "Tìm khách hàng áp dụng",
      fullWidth: true,
      pageLimit: 50,
      showIf: (values) => values.scopeType === "USER",
      getOptionLabel: (c: CustomerModel) => customerLabel(c),
      getOptionValue: (c: CustomerModel) => c?.id,
      async searchPage(keyword: string, page: number, limit: number) {
        const result = await searchCustomer({
          keyword,
          limit,
          page,
          orderBy: "code",
        });
        return result.items;
      },
      async hydrateByIds(ids: Array<number | string>) {
        if (!ids || ids.length === 0) return [];
        const items = await Promise.all(
          ids.map((idValue) => fetchCustomerById(Number(idValue)))
        );
        return items.filter(Boolean);
      },
    },
    {
      name: "conditionTypes",
      label: "Điều kiện",
      kind: "multiselect",
      group: "condition",
      options: [...PROMOTION_CONDITIONS],
      defaultValue: [],
    },
    {
      name: "conditionRemakeCountLte",
      label: "Số lần remake ≤",
      kind: "number",
      group: "condition",
      step: 1,
      showIf: (values) =>
        hasCondition(values, "REMAKE_COUNT_LTE") &&
        !hasCondition(values, "REMAKE_WITHIN_DAYS"),
    },
    {
      name: "conditionRemakeWithinDays",
      label: "Remake trong số ngày",
      kind: "number",
      group: "condition",
      step: 1,
      showIf: (values) =>
        hasCondition(values, "REMAKE_WITHIN_DAYS") &&
        !hasCondition(values, "REMAKE_COUNT_LTE"),
    },
    {
      name: "conditionRemakeReason",
      label: "Lý do remake",
      kind: "text",
      group: "condition",
      showIf: (values) => hasCondition(values, "REMAKE_REASON"),
    },
    {
      name: "startAt",
      label: "Thời gian bắt đầu",
      kind: "datetime",
      group: "timing",
      rules: {
        async: validateStartAt,
      },
    },
    {
      name: "endAt",
      label: "Thời gian kết thúc",
      kind: "datetime",
      group: "timing",
      rules: {
        async: validateEndAt,
      },
    },
    {
      name: "isActive",
      label: "Kích hoạt",
      kind: "switch",
      group: "general",
      defaultValue: true,
    },
  ];

  return {
    idField: "id",
    fields,
    groups: promotionGroups,
    hooks: {
      mapToDto: (v) => {
        const dto = { ...(v.dto ?? {}) };
        const scopeType = dto.scope_type as string | undefined;
        const scopeCategoryIds = dto.scope_category_ids;
        const scopeProductIds = dto.scope_product_ids;
        const scopeUserIds = dto.scope_user_ids;

        delete dto.scope_type;
        delete dto.scope_category_ids;
        delete dto.scope_product_ids;
        delete dto.scope_user_ids;

        let scopeValue: any = null;
        if (scopeType === "CATEGORY") scopeValue = scopeCategoryIds ?? null;
        if (scopeType === "PRODUCT") scopeValue = scopeProductIds ?? null;
        if (scopeType === "USER") scopeValue = scopeUserIds ?? null;

        dto.scopes = scopeType
          ? [{ scope_type: scopeType, scope_value: scopeValue }]
          : [];

        const conditionTypes = dto.condition_types as string[] | undefined;
        const countValue = dto.condition_remake_count_lte;
        const withinValue = dto.condition_remake_within_days;
        const reasonValue = dto.condition_remake_reason;

        delete dto.condition_types;
        delete dto.condition_remake_count_lte;
        delete dto.condition_remake_within_days;
        delete dto.condition_remake_reason;

        const conditions: Array<{ condition_type: string; condition_value: any | null }> = [];
        if (Array.isArray(conditionTypes)) {
          for (const type of conditionTypes) {
            let conditionValue: any = null;
            if (type === "REMAKE_COUNT_LTE") conditionValue = countValue ?? null;
            if (type === "REMAKE_WITHIN_DAYS") conditionValue = withinValue ?? null;
            if (type === "REMAKE_REASON") conditionValue = reasonValue ?? null;
            conditions.push({ condition_type: type, condition_value: conditionValue });
          }
        }
        dto.conditions = conditions;

        return { ...v, dto };
      },
    },
    submit: {
      create: {
        type: "fn",
        run: async (values) => {
          const payload = values.dto as CreatePromotionInputModel;
          await create(payload);
          return values.dto;
        },
      },
      update: {
        type: "fn",
        run: async (values) => {
          const dto = values.dto as Record<string, any>;
          const { id: promotionId, ...payload } = dto;
          await update(
            Number(promotionId),
            payload as UpdatePromotionInputModel,
          );
          return values.dto;
        },
      },
    },
    toasts: {
      saved: ({ mode, values }) =>
        mode === "create"
          ? `Tạo khuyến mãi "${promotionLabel(values)}" thành công!`
          : `Cập nhật khuyến mãi "${promotionLabel(values)}" thành công!`,
      failed: ({ mode, values }) =>
        mode === "create"
          ? `Tạo khuyến mãi "${promotionLabel(values)}" thất bại, vui lòng thử lại!`
          : `Cập nhật khuyến mãi "${promotionLabel(values)}" thất bại, vui lòng thử lại!`,
    },
    async initialResolver(data: any) {
      if (data) {
        const promotion = await id(data.id);
        const firstScope = promotion.scopes?.[0];
        const conditionTypes = promotion.conditions?.map((c) => c.conditionType) ?? [];
        const conditionCount = promotion.conditions?.find((c) => c.conditionType === "REMAKE_COUNT_LTE");
        const conditionWithin = promotion.conditions?.find((c) => c.conditionType === "REMAKE_WITHIN_DAYS");
        const conditionReason = promotion.conditions?.find((c) => c.conditionType === "REMAKE_REASON");

        return {
          ...promotion,
          scopeType: firstScope?.scopeType ?? "ALL",
          scopeCategoryIds: firstScope?.scopeType === "CATEGORY" ? firstScope.scopeValue : [],
          scopeProductIds: firstScope?.scopeType === "PRODUCT" ? firstScope.scopeValue : [],
          scopeUserIds: firstScope?.scopeType === "USER" ? firstScope.scopeValue : [],
          conditionTypes,
          conditionRemakeCountLte: conditionCount?.conditionValue ?? null,
          conditionRemakeWithinDays: conditionWithin?.conditionValue ?? null,
          conditionRemakeReason: conditionReason?.conditionValue ?? null,
        };
      }
      return {};
    },
    async afterSaved() {
      reloadTable("promotions");
    },
  };
}

registerForm("promotion", buildPromotionSchema);

registerFormDialog("promotion", buildPromotionSchema, {
  title: {
    create: "Thêm khuyến mãi",
    update: "Cập nhật khuyến mãi",
  },
  confirmText: {
    create: "Thêm",
    update: "Lưu",
  },
  cancelText: "Thoát",
});

// ----- Promotion Scope
export const PROMOTION_SCOPES = [
  { value: "ALL", label: "Tất cả đơn hàng" },
  { value: "USER", label: "Nhân viên cụ thể" },
  { value: "STAFF", label: "Nhân viên" },
  // { value: "SELLER", label: "Người bán / phòng khám" },
  { value: "CLINIC", label: "Phòng khám" },

  { value: "CATEGORY", label: "Danh mục sản phẩm" },
  { value: "PRODUCT", label: "Sản phẩm cụ thể" },
] as const;

export type PromotionScopeType =
  (typeof PROMOTION_SCOPES)[number]["value"];

export const PROMOTION_SCOPE_LABEL_MAP =
  PROMOTION_SCOPES.reduce<Record<PromotionScopeType, string>>(
    (acc, cur) => {
      acc[cur.value] = cur.label;
      return acc;
    },
    {} as Record<PromotionScopeType, string>
  );

// ----- Promotion Condition
export const PROMOTION_CONDITIONS = [
  {
    value: "ORDER_IS_REMAKE",
    label: "Đơn hàng remake",
  },
  {
    value: "REMAKE_COUNT_LTE",
    label: "Số lần remake ≤",
  },
  {
    value: "REMAKE_WITHIN_DAYS",
    label: "Remake trong số ngày",
  },
  {
    value: "REMAKE_REASON",
    label: "Lý do remake",
  },
] as const;

export type PromotionConditionType =
  (typeof PROMOTION_CONDITIONS)[number]["value"];

export const PROMOTION_CONDITION_LABEL_MAP =
  PROMOTION_CONDITIONS.reduce<Record<PromotionConditionType, string>>(
    (acc, cur) => {
      acc[cur.value] = cur.label;
      return acc;
    },
    {} as Record<PromotionConditionType, string>
  );

// ----- Promotion Discount
export const PROMOTION_DISCOUNT_TYPES = [
  { value: "fixed", label: "Giảm giá cố định" },
  { value: "percent", label: "Giảm theo phần trăm" },
  { value: "free_shipping", label: "Miễn phí vận chuyển" },
] as const;

export type PromotionDiscountType =
  (typeof PROMOTION_DISCOUNT_TYPES)[number]["value"];

export const PROMOTION_DISCOUNT_LABEL_MAP =
  PROMOTION_DISCOUNT_TYPES.reduce<Record<PromotionDiscountType, string>>(
    (acc, cur) => {
      acc[cur.value] = cur.label;
      return acc;
    },
    {} as Record<PromotionDiscountType, string>
  );

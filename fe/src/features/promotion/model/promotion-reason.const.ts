export type PromotionErrorReason =
  | "promotion_not_found"
  | "promotion_inactive"
  | "promotion_not_started"
  | "promotion_expired"
  | "promotion_scope_not_matched"
  | "promotion_total_usage_limit_reached"
  | "promotion_user_usage_limit_reached"
  | "promo_code_required"
  | "order_required"
  | "condition_order_is_remake_not_met"
  | "condition_remake_count_lte_not_met"
  | "condition_remake_within_days_not_met"
  | "condition_remake_reason_not_met"
  | "min_order_value_not_met";

export const PROMOTION_ERROR_MESSAGES_VI: Record<string, string> = {
  promotion_not_found: "Mã khuyến mãi không tồn tại.",
  promotion_inactive: "Mã khuyến mãi hiện không còn hiệu lực.",
  promotion_not_started: "Mã khuyến mãi chưa đến thời gian áp dụng.",
  promotion_expired: "Mã khuyến mãi đã hết hạn.",

  promotion_scope_not_matched: "Mã khuyến mãi không áp dụng cho đơn hàng này.",

  promotion_total_usage_limit_reached:
    "Mã khuyến mãi đã đạt giới hạn số lần sử dụng.",
  promotion_user_usage_limit_reached:
    "Bạn đã sử dụng mã khuyến mãi này quá số lần cho phép.",

  promo_code_required: "Vui lòng nhập mã khuyến mãi.",
  order_required: "Không tìm thấy thông tin đơn hàng.",

  condition_order_is_remake_not_met:
    "Mã khuyến mãi chỉ áp dụng cho đơn hàng làm lại.",
  condition_remake_count_lte_not_met:
    "Số lần làm lại của đơn hàng không phù hợp với điều kiện khuyến mãi.",
  condition_remake_within_days_not_met:
    "Đơn hàng làm lại đã vượt quá thời gian cho phép áp dụng khuyến mãi.",
  condition_remake_reason_not_met:
    "Lý do làm lại không phù hợp với điều kiện khuyến mãi.",

  min_order_value_not_met:
    "Giá trị đơn hàng chưa đạt mức tối thiểu để áp dụng khuyến mãi.",
};

export function getPromotionErrorMessage(
  reason?: string,
  fallback = "Không thể áp dụng mã khuyến mãi."
): string {
  if (!reason) return fallback;
  return PROMOTION_ERROR_MESSAGES_VI[reason] ?? fallback;
}

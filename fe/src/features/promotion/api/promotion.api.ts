import { apiClient } from "@core/network/api-client";
import { mapper } from "@core/mapper/auto-mapper";
import type { PromotionCodeModel } from "@features/promotion/model/promotion.model";
import { useAuthStore } from "@store/auth-store";
import type { OrderModel } from "@root/features/order/model/order.model";

type PromotionValidatePayload = {
  promo_code: string;
  order: any;
};

type PromotionValidateResponseDto = {
  valid: boolean;
  reason?: string;
  discount_amount?: number;
  final_price?: number;
};

export type PromotionValidateResult = {
  valid: boolean;
  reason?: string;
  discountAmount?: number;
  finalPrice?: number;
};

export async function validatePromotion(payload: { promoCode: string; order: any }): Promise<PromotionValidateResult> {
  const { departmentApiPath } = useAuthStore.getState();
  // const orderDto = mapper.map<any, OrderModel>("Order", payload.order, "model_to_dto");
  const { data } = await apiClient.post<PromotionValidateResponseDto>(`${departmentApiPath()}/promotions/validate`, {
    promo_code: payload.promoCode,
    order: payload.order
  } as PromotionValidatePayload);

  return {
    valid: data.valid,
    reason: data.reason,
    discountAmount: data.discount_amount,
    finalPrice: data.final_price,
  };
}

export async function calculateTotalPrice(payload: { promoCode: string; order: any }): Promise<PromotionValidateResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<PromotionValidateResponseDto>(`${departmentApiPath()}/promotions/calculate-total-price`, {
    promo_code: payload.promoCode,
    order: payload.order
  } as PromotionValidatePayload);

  return {
    valid: data.valid,
    reason: data.reason,
    discountAmount: data.discount_amount,
    finalPrice: data.final_price,
  };
}

type PromotionApplyPayload = {
  promo_code: string;
  order: any;
};

type PromotionApplyResponseDto = {
  success: boolean;
  reason?: string;
  applied_discount?: number;
  promo_snapshot?: unknown;
};

export type PromotionApplyResult = {
  success: boolean;
  reason?: string;
  appliedDiscount?: number;
  promoSnapshot?: unknown;
};

export async function applyPromotion(payload: { promoCode: string; order: OrderModel }): Promise<PromotionApplyResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const orderDto = mapper.map<any, OrderModel>("Order", payload.order, "model_to_dto");
  const { data } = await apiClient.post<PromotionApplyResponseDto>(`${departmentApiPath()}/promotions/apply`, {
    promo_code: payload.promoCode,
    order: orderDto,
  } as PromotionApplyPayload);

  return {
    success: data.success,
    reason: data.reason,
    appliedDiscount: data.applied_discount,
    promoSnapshot: data.promo_snapshot,
  };
}

export async function getPromotionCodesInUsageByOrderId(orderId: number): Promise<PromotionCodeModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any[]>(`${departmentApiPath()}/order/${orderId}/promotions`);
  const result = mapper.map<any[], PromotionCodeModel[]>("PromotionCode", data, "dto_to_model");
  return result;
}

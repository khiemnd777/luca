import type {
  PromotionConditionType,
  PromotionScopeType,
} from "@features/promotion/model/promotion.const";

export interface PromotionScopeInputModel {
  scopeType: PromotionScopeType;
  scopeValue: any[] | null;
}

export interface PromotionConditionInputModel {
  conditionType: PromotionConditionType;
  conditionValue: any | null;
}

export interface PromotionCodeModel {
  id: number;
  code: string;
  name?: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue?: number | null;
  totalUsageLimit?: number | null;
  usagePerUser?: number | null;
  startAt: string;
  endAt?: string | null;
  isActive: boolean;
  scopes?: PromotionScopeInputModel[];
  conditions?: PromotionConditionInputModel[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionInputModel {
  code: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue?: number | null;
  totalUsageLimit?: number | null;
  usagePerUser?: number | null;
  startAt?: string;
  endAt?: string;
  isActive: boolean;
  scopes: PromotionScopeInputModel[];
  conditions: PromotionConditionInputModel[];
}

export interface UpdatePromotionInputModel {
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue?: number | null;
  totalUsageLimit?: number | null;
  usagePerUser?: number | null;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
  scopes: PromotionScopeInputModel[];
  conditions: PromotionConditionInputModel[];
}

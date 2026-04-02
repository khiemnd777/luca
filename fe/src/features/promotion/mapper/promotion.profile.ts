import { mapper } from "@core/mapper/auto-mapper";
import type { PromotionCodeModel } from "@features/promotion/model/promotion.model";

mapper.register<PromotionCodeModel>({
  name: "PromotionCode",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    code: "",
    name: "",
    discountType: "",
    discountValue: 0,
    maxDiscountAmount: null,
    minOrderValue: null,
    totalUsageLimit: null,
    usagePerUser: null,
    startAt: "",
    endAt: null,
    isActive: false,
    scopes: [],
    conditions: [],
    createdAt: "",
    updatedAt: "",
  }),
});

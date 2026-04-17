import { mapper } from "@root/core/mapper/auto-mapper";
import type { ProductOverviewModel } from "@features/product/model/product-overview.model";

mapper.register<ProductOverviewModel>({
  name: "ProductOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    scope: {
      rootProductId: 0,
      rootProductName: null,
      isTemplate: false,
      includesVariants: false,
      variantCount: 0,
      scopedProductIds: [],
      scopeLabel: "",
    },
    summary: {
      openOrders: 0,
      inProductionOrders: 0,
      openQuantity: 0,
      openProcesses: 0,
      completionPercent: 0,
      lifetimeOrders: 0,
      lifetimeQuantity: 0,
      completedOrders: 0,
      remakeOrders: 0,
    },
    orderStatusBreakdown: [],
    processLoad: [],
    recentOrders: [],
  }),
});

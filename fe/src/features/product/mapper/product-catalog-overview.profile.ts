import { mapper } from "@root/core/mapper/auto-mapper";
import type { ProductCatalogOverviewModel } from "@features/product/model/product-catalog-overview.model";

mapper.register<ProductCatalogOverviewModel>({
  name: "ProductCatalogOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    coverage: {
      totalCatalogProducts: 0,
      productsWithOrders: 0,
      scopeLabel: "",
    },
    summary: {
      openOrders: 0,
      inProductionOrders: 0,
      openQuantity: 0,
      openProcesses: 0,
      completionPercent: 0,
      lifetimeOrders: 0,
      completedOrders: 0,
      remakeOrders: 0,
    },
    orderStatusBreakdown: [],
    processLoad: [],
  }),
});

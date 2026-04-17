import { mapper } from "@root/core/mapper/auto-mapper";
import type { MaterialCatalogOverviewModel } from "@features/material/model/material-catalog-overview.model";

mapper.register<MaterialCatalogOverviewModel>({
  name: "MaterialCatalogOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    coverage: {
      totalCatalogMaterials: 0,
      materialsWithOrders: 0,
      scopeLabel: "",
    },
    summary: {
      openOrders: 0,
      inProductionOrders: 0,
      onLoanQuantity: 0,
      openProcesses: 0,
      completionPercent: 0,
      lifetimeOrders: 0,
      returnedOrders: 0,
      partialReturnedOrders: 0,
    },
    orderStatusBreakdown: [],
    materialStatusBreakdown: [],
    processLoad: [],
  }),
});

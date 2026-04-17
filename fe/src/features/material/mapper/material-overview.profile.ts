import { mapper } from "@root/core/mapper/auto-mapper";
import type { MaterialOverviewModel } from "@features/material/model/material-overview.model";

mapper.register<MaterialOverviewModel>({
  name: "MaterialOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    scope: {
      materialId: 0,
      materialCode: null,
      materialName: null,
      type: null,
      isImplant: false,
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
    recentOrders: [],
  }),
});

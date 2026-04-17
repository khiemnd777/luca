import { mapper } from "@root/core/mapper/auto-mapper";
import type { ProcessCatalogOverviewModel } from "@features/process/model/process-catalog-overview.model";

mapper.register<ProcessCatalogOverviewModel>({
  name: "ProcessCatalogOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    coverage: {
      totalProcesses: 0,
      processesWithOrders: 0,
      scopeLabel: "",
    },
    summary: {
      openOrders: 0,
      inProductionOrders: 0,
      openProcesses: 0,
      completionPercent: 0,
      lifetimeOrders: 0,
      completedOrders: 0,
      remakeOrders: 0,
    },
    orderStatusBreakdown: [],
    processLoads: [],
  }),
});

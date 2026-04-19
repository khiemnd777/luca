import { mapper } from "@root/core/mapper/auto-mapper";
import type { DentistCatalogOverviewModel } from "@features/dentist/model/dentist-catalog-overview.model";

mapper.register<DentistCatalogOverviewModel>({
  name: "DentistCatalogOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    coverage: {
      totalDentists: 0,
      dentistsWithOrders: 0,
      scopeLabel: "",
    },
    summary: {
      openOrders: 0,
      inProductionOrders: 0,
      completedOrders: 0,
      remakeOrders: 0,
      lifetimeOrders: 0,
      completionPercent: 0,
    },
    orderStatusBreakdown: [],
    dentistLoads: [],
  }),
});

import { mapper } from "@root/core/mapper/auto-mapper";
import type { ClinicCatalogOverviewModel } from "@features/clinic/model/clinic-catalog-overview.model";

mapper.register<ClinicCatalogOverviewModel>({
  name: "ClinicCatalogOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    coverage: {
      totalClinics: 0,
      clinicsWithOrders: 0,
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
    clinicLoads: [],
  }),
});

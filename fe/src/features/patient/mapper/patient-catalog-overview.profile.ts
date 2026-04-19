import { mapper } from "@root/core/mapper/auto-mapper";
import type { PatientCatalogOverviewModel } from "@features/patient/model/patient-catalog-overview.model";

mapper.register<PatientCatalogOverviewModel>({
  name: "PatientCatalogOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    coverage: {
      totalPatients: 0,
      patientsWithOrders: 0,
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
    patientLoads: [],
  }),
});

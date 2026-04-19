import { mapper } from "@root/core/mapper/auto-mapper";
import type { PatientOverviewModel } from "@features/patient/model/patient-overview.model";

mapper.register<PatientOverviewModel>({
  name: "PatientOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    scope: {
      patientId: 0,
      patientName: "",
      phoneNumber: "",
      clinicCount: 0,
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
    processLoad: [],
    recentOrders: [],
  }),
});

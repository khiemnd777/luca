import { mapper } from "@root/core/mapper/auto-mapper";
import type { DentistOverviewModel } from "@features/dentist/model/dentist-overview.model";

mapper.register<DentistOverviewModel>({
  name: "DentistOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    scope: {
      dentistId: 0,
      dentistName: "",
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

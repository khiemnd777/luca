import { mapper } from "@root/core/mapper/auto-mapper";
import type { ClinicOverviewModel } from "@features/clinic/model/clinic-overview.model";

mapper.register<ClinicOverviewModel>({
  name: "ClinicOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    scope: {
      clinicId: 0,
      clinicName: "",
      phoneNumber: "",
      dentistCount: 0,
      patientCount: 0,
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

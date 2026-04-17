import { mapper } from "@root/core/mapper/auto-mapper";
import type { SectionOverviewModel } from "@features/section/model/section-overview.model";

mapper.register<SectionOverviewModel>({
  name: "SectionOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    scope: {
      sectionId: 0,
      sectionName: null,
      leaderName: null,
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
    processLoad: [],
    recentOrders: [],
  }),
});

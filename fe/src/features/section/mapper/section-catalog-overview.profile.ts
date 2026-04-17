import { mapper } from "@root/core/mapper/auto-mapper";
import type { SectionCatalogOverviewModel } from "@features/section/model/section-catalog-overview.model";

mapper.register<SectionCatalogOverviewModel>({
  name: "SectionCatalogOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    coverage: {
      totalSections: 0,
      sectionsWithOrders: 0,
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
    sectionLoads: [],
  }),
});

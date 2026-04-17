export interface SectionCatalogOverviewCoverageModel {
  totalSections: number;
  sectionsWithOrders: number;
  scopeLabel: string;
}

export interface SectionCatalogOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  openProcesses: number;
  completionPercent: number;
  lifetimeOrders: number;
  completedOrders: number;
  remakeOrders: number;
}

export interface SectionCatalogOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface SectionCatalogOverviewSectionLoadModel {
  sectionId: number;
  sectionName?: string | null;
  leaderName?: string | null;
  activeOrders: number;
  inProductionOrders: number;
  openProcesses: number;
  completionPercent: number;
}

export interface SectionCatalogOverviewModel {
  coverage: SectionCatalogOverviewCoverageModel;
  summary: SectionCatalogOverviewSummaryModel;
  orderStatusBreakdown: SectionCatalogOverviewOrderStatusBreakdownModel[];
  sectionLoads: SectionCatalogOverviewSectionLoadModel[];
}

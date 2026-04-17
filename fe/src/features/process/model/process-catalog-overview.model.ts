export interface ProcessCatalogOverviewCoverageModel {
  totalProcesses: number;
  processesWithOrders: number;
  scopeLabel: string;
}

export interface ProcessCatalogOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  openProcesses: number;
  completionPercent: number;
  lifetimeOrders: number;
  completedOrders: number;
  remakeOrders: number;
}

export interface ProcessCatalogOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface ProcessCatalogOverviewProcessLoadModel {
  processId: number;
  processCode?: string | null;
  processName?: string | null;
  sectionName?: string | null;
  activeOrders: number;
  inProductionOrders: number;
  openProcesses: number;
  completionPercent: number;
}

export interface ProcessCatalogOverviewModel {
  coverage: ProcessCatalogOverviewCoverageModel;
  summary: ProcessCatalogOverviewSummaryModel;
  orderStatusBreakdown: ProcessCatalogOverviewOrderStatusBreakdownModel[];
  processLoads: ProcessCatalogOverviewProcessLoadModel[];
}

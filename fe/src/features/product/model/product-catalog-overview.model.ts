export interface ProductCatalogOverviewCoverageModel {
  totalCatalogProducts: number;
  productsWithOrders: number;
  scopeLabel: string;
}

export interface ProductCatalogOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  openQuantity: number;
  openProcesses: number;
  completionPercent: number;
  lifetimeOrders: number;
  completedOrders: number;
  remakeOrders: number;
}

export interface ProductCatalogOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface ProductCatalogOverviewProcessLoadModel {
  processName: string;
  stepNumber: number;
  waiting: number;
  inProgress: number;
  qc: number;
  rework: number;
  completed: number;
  total: number;
  activeOrders: number;
}

export interface ProductCatalogOverviewModel {
  coverage: ProductCatalogOverviewCoverageModel;
  summary: ProductCatalogOverviewSummaryModel;
  orderStatusBreakdown: ProductCatalogOverviewOrderStatusBreakdownModel[];
  processLoad: ProductCatalogOverviewProcessLoadModel[];
}

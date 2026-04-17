export interface MaterialCatalogOverviewCoverageModel {
  totalCatalogMaterials: number;
  materialsWithOrders: number;
  scopeLabel: string;
}

export interface MaterialCatalogOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  onLoanQuantity: number;
  openProcesses: number;
  completionPercent: number;
  lifetimeOrders: number;
  returnedOrders: number;
  partialReturnedOrders: number;
}

export interface MaterialCatalogOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface MaterialCatalogOverviewMaterialStatusBreakdownModel {
  status: string;
  count: number;
}

export interface MaterialCatalogOverviewProcessLoadModel {
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

export interface MaterialCatalogOverviewModel {
  coverage: MaterialCatalogOverviewCoverageModel;
  summary: MaterialCatalogOverviewSummaryModel;
  orderStatusBreakdown: MaterialCatalogOverviewOrderStatusBreakdownModel[];
  materialStatusBreakdown: MaterialCatalogOverviewMaterialStatusBreakdownModel[];
  processLoad: MaterialCatalogOverviewProcessLoadModel[];
}

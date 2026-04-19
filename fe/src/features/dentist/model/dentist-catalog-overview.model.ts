export interface DentistCatalogOverviewCoverageModel {
  totalDentists: number;
  dentistsWithOrders: number;
  scopeLabel: string;
}

export interface DentistCatalogOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  remakeOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface DentistCatalogOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface DentistCatalogOverviewDentistLoadModel {
  dentistId: number;
  dentistName?: string | null;
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface DentistCatalogOverviewModel {
  coverage: DentistCatalogOverviewCoverageModel;
  summary: DentistCatalogOverviewSummaryModel;
  orderStatusBreakdown: DentistCatalogOverviewOrderStatusBreakdownModel[];
  dentistLoads: DentistCatalogOverviewDentistLoadModel[];
}

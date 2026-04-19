export interface ClinicCatalogOverviewCoverageModel {
  totalClinics: number;
  clinicsWithOrders: number;
  scopeLabel: string;
}

export interface ClinicCatalogOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  remakeOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface ClinicCatalogOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface ClinicCatalogOverviewClinicLoadModel {
  clinicId: number;
  clinicName?: string | null;
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface ClinicCatalogOverviewModel {
  coverage: ClinicCatalogOverviewCoverageModel;
  summary: ClinicCatalogOverviewSummaryModel;
  orderStatusBreakdown: ClinicCatalogOverviewOrderStatusBreakdownModel[];
  clinicLoads: ClinicCatalogOverviewClinicLoadModel[];
}

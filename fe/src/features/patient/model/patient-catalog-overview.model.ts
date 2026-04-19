export interface PatientCatalogOverviewCoverageModel {
  totalPatients: number;
  patientsWithOrders: number;
  scopeLabel: string;
}

export interface PatientCatalogOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  remakeOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface PatientCatalogOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface PatientCatalogOverviewPatientLoadModel {
  patientId: number;
  patientName?: string | null;
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface PatientCatalogOverviewModel {
  coverage: PatientCatalogOverviewCoverageModel;
  summary: PatientCatalogOverviewSummaryModel;
  orderStatusBreakdown: PatientCatalogOverviewOrderStatusBreakdownModel[];
  patientLoads: PatientCatalogOverviewPatientLoadModel[];
}

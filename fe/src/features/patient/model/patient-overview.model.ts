export interface PatientOverviewScopeModel {
  patientId: number;
  patientName?: string | null;
  phoneNumber?: string | null;
  clinicCount: number;
  scopeLabel: string;
}

export interface PatientOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  remakeOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface PatientOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface PatientOverviewProcessLoadModel {
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

export interface PatientOverviewRecentOrderModel {
  orderId: number;
  orderCode?: string | null;
  status?: string | null;
  clinicName?: string | null;
  dentistName?: string | null;
  currentProcessName?: string | null;
  latestCheckpointAt?: string | null;
}

export interface PatientOverviewModel {
  scope: PatientOverviewScopeModel;
  summary: PatientOverviewSummaryModel;
  orderStatusBreakdown: PatientOverviewOrderStatusBreakdownModel[];
  processLoad: PatientOverviewProcessLoadModel[];
  recentOrders: PatientOverviewRecentOrderModel[];
}

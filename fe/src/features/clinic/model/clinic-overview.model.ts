export interface ClinicOverviewScopeModel {
  clinicId: number;
  clinicName?: string | null;
  phoneNumber?: string | null;
  dentistCount: number;
  patientCount: number;
  scopeLabel: string;
}

export interface ClinicOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  remakeOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface ClinicOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface ClinicOverviewProcessLoadModel {
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

export interface ClinicOverviewRecentOrderModel {
  orderId: number;
  orderCode?: string | null;
  status?: string | null;
  patientName?: string | null;
  currentProcessName?: string | null;
  latestCheckpointAt?: string | null;
}

export interface ClinicOverviewModel {
  scope: ClinicOverviewScopeModel;
  summary: ClinicOverviewSummaryModel;
  orderStatusBreakdown: ClinicOverviewOrderStatusBreakdownModel[];
  processLoad: ClinicOverviewProcessLoadModel[];
  recentOrders: ClinicOverviewRecentOrderModel[];
}

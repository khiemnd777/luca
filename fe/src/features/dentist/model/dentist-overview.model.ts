export interface DentistOverviewScopeModel {
  dentistId: number;
  dentistName?: string | null;
  phoneNumber?: string | null;
  clinicCount: number;
  scopeLabel: string;
}

export interface DentistOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  remakeOrders: number;
  lifetimeOrders: number;
  completionPercent: number;
}

export interface DentistOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface DentistOverviewProcessLoadModel {
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

export interface DentistOverviewRecentOrderModel {
  orderId: number;
  orderCode?: string | null;
  status?: string | null;
  clinicName?: string | null;
  patientName?: string | null;
  currentProcessName?: string | null;
  latestCheckpointAt?: string | null;
}

export interface DentistOverviewModel {
  scope: DentistOverviewScopeModel;
  summary: DentistOverviewSummaryModel;
  orderStatusBreakdown: DentistOverviewOrderStatusBreakdownModel[];
  processLoad: DentistOverviewProcessLoadModel[];
  recentOrders: DentistOverviewRecentOrderModel[];
}

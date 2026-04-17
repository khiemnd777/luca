export interface SectionOverviewScopeModel {
  sectionId: number;
  sectionName?: string | null;
  leaderName?: string | null;
  scopeLabel: string;
}

export interface SectionOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  openProcesses: number;
  completionPercent: number;
  lifetimeOrders: number;
  completedOrders: number;
  remakeOrders: number;
}

export interface SectionOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface SectionOverviewProcessLoadModel {
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

export interface SectionOverviewRecentOrderModel {
  orderId: number;
  orderCode?: string | null;
  status?: string | null;
  clinicName?: string | null;
  patientName?: string | null;
  currentProcessName?: string | null;
  latestCheckpointAt?: string | null;
}

export interface SectionOverviewModel {
  scope: SectionOverviewScopeModel;
  summary: SectionOverviewSummaryModel;
  orderStatusBreakdown: SectionOverviewOrderStatusBreakdownModel[];
  processLoad: SectionOverviewProcessLoadModel[];
  recentOrders: SectionOverviewRecentOrderModel[];
}

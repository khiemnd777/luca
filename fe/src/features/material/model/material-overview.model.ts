export interface MaterialOverviewScopeModel {
  materialId: number;
  materialCode?: string | null;
  materialName?: string | null;
  type?: string | null;
  isImplant: boolean;
  scopeLabel: string;
}

export interface MaterialOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  onLoanQuantity: number;
  openProcesses: number;
  completionPercent: number;
  lifetimeOrders: number;
  returnedOrders: number;
  partialReturnedOrders: number;
}

export interface MaterialOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface MaterialOverviewMaterialStatusBreakdownModel {
  status: string;
  count: number;
}

export interface MaterialOverviewProcessLoadModel {
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

export interface MaterialOverviewRecentOrderModel {
  orderId: number;
  orderCode?: string | null;
  orderItemId: number;
  orderItemCode?: string | null;
  status?: string | null;
  materialStatus?: string | null;
  quantity: number;
  clinicName?: string | null;
  patientName?: string | null;
  currentProcessName?: string | null;
  latestCheckpointAt?: string | null;
}

export interface MaterialOverviewModel {
  scope: MaterialOverviewScopeModel;
  summary: MaterialOverviewSummaryModel;
  orderStatusBreakdown: MaterialOverviewOrderStatusBreakdownModel[];
  materialStatusBreakdown: MaterialOverviewMaterialStatusBreakdownModel[];
  processLoad: MaterialOverviewProcessLoadModel[];
  recentOrders: MaterialOverviewRecentOrderModel[];
}

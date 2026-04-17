export interface ProductOverviewScopeModel {
  rootProductId: number;
  rootProductName?: string | null;
  isTemplate: boolean;
  includesVariants: boolean;
  variantCount: number;
  scopedProductIds: number[];
  scopeLabel: string;
}

export interface ProductOverviewSummaryModel {
  openOrders: number;
  inProductionOrders: number;
  openQuantity: number;
  openProcesses: number;
  completionPercent: number;
  lifetimeOrders: number;
  lifetimeQuantity: number;
  completedOrders: number;
  remakeOrders: number;
}

export interface ProductOverviewOrderStatusBreakdownModel {
  status: string;
  count: number;
}

export interface ProductOverviewProcessLoadModel {
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

export interface ProductOverviewRecentOrderModel {
  orderId: number;
  orderCode?: string | null;
  status?: string | null;
  quantity: number;
  currentProcessName?: string | null;
  latestCheckpointAt?: string | null;
}

export interface ProductOverviewModel {
  scope: ProductOverviewScopeModel;
  summary: ProductOverviewSummaryModel;
  orderStatusBreakdown: ProductOverviewOrderStatusBreakdownModel[];
  processLoad: ProductOverviewProcessLoadModel[];
  recentOrders: ProductOverviewRecentOrderModel[];
}

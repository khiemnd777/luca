export interface StaffOverviewRevenueWindowModel {
  key: string;
  label: string;
  months: number;
  orderCount: number;
  totalRevenue: number;
}

export interface StaffOverviewSummaryModel {
  lifetimeOrders: number;
  lifetimeRevenue: number;
  averageOrderValue: number;
  recentOrderCount: number;
  recentRevenue: number;
}

export interface StaffOverviewModel {
  staffId: number;
  revenueWindows: StaffOverviewRevenueWindowModel[];
  summary: StaffOverviewSummaryModel;
}

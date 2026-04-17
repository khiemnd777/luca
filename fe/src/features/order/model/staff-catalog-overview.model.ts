export interface StaffCatalogOverviewSectionLoadModel {
  sectionName: string;
  staffCount: number;
  openProcesses: number;
}

export interface StaffCatalogOverviewPerformerModel {
  staffId: number;
  name: string;
  openProcesses: number;
  recentCompletedProcesses: number;
  recentOrders: number;
  recentRevenue: number;
}

export interface StaffCatalogOverviewCoverageModel {
  expectedStaffs: number;
  staffsWithOrderData: number;
  failedStaffs: number;
}

export interface StaffCatalogOverviewSummaryModel {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  assignedStaffCount: number;
  idleStaffCount: number;
  totalOpenProcesses: number;
  totalRecentCompletedProcesses: number;
  totalRecentOrders: number;
  totalRecentRevenue: number;
  avgOpenProcessesPerAssigned: number;
  engagementRate: number;
  backlogStatusCounts: Record<string, number>;
  sectionLoads: StaffCatalogOverviewSectionLoadModel[];
  workforceSections: StaffCatalogOverviewSectionLoadModel[];
  topPerformers: StaffCatalogOverviewPerformerModel[];
  coverage: StaffCatalogOverviewCoverageModel;
}

export interface StaffCatalogOverviewModel {
  summary: StaffCatalogOverviewSummaryModel;
}

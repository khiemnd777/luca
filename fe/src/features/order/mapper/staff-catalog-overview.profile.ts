import { mapper } from "@root/core/mapper/auto-mapper";
import type { StaffCatalogOverviewModel } from "@features/order/model/staff-catalog-overview.model";

mapper.register<StaffCatalogOverviewModel>({
  name: "StaffCatalogOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    summary: {
      totalStaff: 0,
      activeStaff: 0,
      inactiveStaff: 0,
      assignedStaffCount: 0,
      idleStaffCount: 0,
      totalOpenProcesses: 0,
      totalRecentCompletedProcesses: 0,
      totalRecentOrders: 0,
      totalRecentRevenue: 0,
      avgOpenProcessesPerAssigned: 0,
      engagementRate: 0,
      backlogStatusCounts: {
        waiting: 0,
        inProgress: 0,
        qc: 0,
        rework: 0,
        completed: 0,
      },
      sectionLoads: [],
      workforceSections: [],
      topPerformers: [],
      coverage: {
        expectedStaffs: 0,
        staffsWithOrderData: 0,
        failedStaffs: 0,
      },
    },
  }),
});

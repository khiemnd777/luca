import { mapper } from "@root/core/mapper/auto-mapper";
import type { StaffOverviewModel } from "@features/order/model/staff-overview.model";

mapper.register<StaffOverviewModel>({
  name: "StaffOverview",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    staffId: 0,
    revenueWindows: [],
    summary: {
      lifetimeOrders: 0,
      lifetimeRevenue: 0,
      averageOrderValue: 0,
      recentOrderCount: 0,
      recentRevenue: 0,
    },
  }),
});

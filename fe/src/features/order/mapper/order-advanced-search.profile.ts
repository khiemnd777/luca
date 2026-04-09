import { mapper } from "@root/core/mapper/auto-mapper";
import type { OrderAdvancedSearchReportModel } from "@features/order/model/order-advanced-search.model";

mapper.register<OrderAdvancedSearchReportModel>({
  name: "OrderAdvancedSearchReport",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    totalOrders: 0,
    totalValue: 0,
    averageOrderValue: 0,
    remakeOrders: 0,
    totalSales: 0,
    totalRevenue: 0,
    statusBreakdown: [],
    topProducts: [],
  }),
});

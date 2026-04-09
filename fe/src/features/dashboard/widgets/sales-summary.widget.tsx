/* eslint-disable react-refresh/only-export-components */
import { useSalesSummary } from "@features/dashboard/api/dashboard.api";
import { salesRangeLabel, useDashboardContext } from "@features/dashboard/context/dashboard-context";
import type { SalesSummaryModel } from "@features/dashboard/model/dashboard.model";
import { registerSlot } from "@root/core/module/registry";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";
import { SalesSummary } from "../components/sale-summary";

export const mockSalesSummary: SalesSummaryModel = {
  totalRevenue: 0,
  orderItemsCount: 0,
  prevRevenue: 0,
  growthPercent: 0,
};

function SalesSummaryWidget() {
  const { range, departmentId, cacheNamespace } = useDashboardContext();
  const { data: salesSummaryData } = useSalesSummary(range, { departmentId, cacheNamespace });
  const data = salesSummaryData ?? mockSalesSummary;
  return <SalesSummary data={data} rangeText={salesRangeLabel(range)} />;
}

registerSlot({
  id: "dashboard-sales-summary",
  name: "dashboard:line1",
  render: () => <SalesSummaryWidget />,
  priority: 1,
});

// registerSlot({
//   id: "order-sales-summary",
//   name: "order:header",
//   render: () => <SalesSummaryWidget />,
//   priority: 1,
// });

// WS
function SalesSummaryWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:sales_summary") {
      invalidate("dashboard:sales-summary");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<SalesSummaryWSWidget />);

/* eslint-disable react-refresh/only-export-components */
import { useSalesDaily } from "@features/dashboard/api/dashboard.api";
import { salesRangeLabel, useDashboardContext } from "@features/dashboard/context/dashboard-context";
import type { SalesDailyItem } from "@features/dashboard/model/dashboard.model";
import { registerSlot } from "@root/core/module/registry";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";
import { SalesDaily } from "../components/sales-daily";

const mockSalesDaily: SalesDailyItem[] = [
  // { date: "2026-01-27", revenue: 3_200_000 },
  // { date: "2026-01-28", revenue: 4_850_000 },
  // { date: "2026-01-29", revenue: 5_400_000 },
  // { date: "2026-01-30", revenue: 6_100_000 },
  // { date: "2026-01-31", revenue: 5_750_000 },
  // { date: "2026-02-01", revenue: 7_200_000 },
  // { date: "2026-02-02", revenue: 6_450_000 },
  { date: "2024-06-20", revenue: 0 },
];

function SalesDailyWidget() {
  const { range, departmentId, cacheNamespace } = useDashboardContext();
  const { data: salesDailydata } = useSalesDaily(range, { departmentId, cacheNamespace });
  const dueToday = salesDailydata && salesDailydata.length > 0 ? salesDailydata : mockSalesDaily;
  return <SalesDaily data={dueToday} rangeText={salesRangeLabel(range)} />;
}

registerSlot({
  id: "dashboard-sales-daily",
  name: "dashboard:line1",
  render: () => <SalesDailyWidget />,
  priority: 1,
});

// WS
function SalesDailyWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:sales_daily") {
      invalidate("dashboard:sales-daily");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<SalesDailyWSWidget />);

import { useSalesDaily } from "@features/dashboard/api/dashboard.api";
import type { SalesDailyItem, SalesReportRange } from "@features/dashboard/model/dashboard.model";
import { registerSlot } from "@root/core/module/registry";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
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
  const [range, setRange] = useState<SalesReportRange>("7d");
  const { data: salesDailydata } = useSalesDaily(range);
  const dueToday = salesDailydata && salesDailydata.length > 0 ? salesDailydata : mockSalesDaily;
  const rangeText = useMemo(() => {
    if (range === "today") return "hôm nay";
    if (range === "7d") return "trong 7 ngày";
    return "trong 30 ngày";
  }, [range]);
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <ToggleButtonGroup
          value={range}
          exclusive
          size="small"
          onChange={(_, value) => value && setRange(value)}
        >
          <ToggleButton value="today">Hôm nay</ToggleButton>
          <ToggleButton value="7d">7 ngày</ToggleButton>
          <ToggleButton value="30d">30 ngày</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <SalesDaily data={dueToday} rangeText={rangeText} />
    </>
  );
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

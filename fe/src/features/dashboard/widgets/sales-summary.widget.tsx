import { useSalesSummary } from "@features/dashboard/api/dashboard.api";
import type { SalesSummaryModel } from "@features/dashboard/model/dashboard.model";
import { registerSlot } from "@root/core/module/registry";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";
import { SalesSummary } from "../components/sale-summary";
import type { SalesReportRange } from "@features/dashboard/model/dashboard.model";

export const mockSalesSummary: SalesSummaryModel = {
  totalRevenue: 0,
  orderItemsCount: 0,
  prevRevenue: 0,
  growthPercent: 0,
};

function SalesSummaryWidget() {
  const [range, setRange] = useState<SalesReportRange>("7d");
  const { data: salesSummaryData } = useSalesSummary(range);
  const data = salesSummaryData ?? mockSalesSummary;
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
      <SalesSummary data={data} rangeText={rangeText} />
    </>
  );
}

registerSlot({
  id: "dashboard-sales-summary",
  name: "dashboard:line1",
  render: () => <SalesSummaryWidget />,
  priority: 1,
});

registerSlot({
  id: "order-sales-summary",
  name: "order:header",
  render: () => <SalesSummaryWidget />,
  priority: 1,
});

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

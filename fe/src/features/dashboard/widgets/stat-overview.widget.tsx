import { Box, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { SalesReportRange } from "@features/dashboard/model/dashboard.model";
import { registerSlot } from "@root/core/module/registry";
import { useState } from "react";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { ActiveCasesStatWidget } from "./stat-active-cases.widget";
import { AvgTurnaroundStatWidget } from "./stat-avg-turnaround.widget";
import { CasesCompletedStatWidget } from "./stat-cases-completed.widget";
import { RemakesStatWidget } from "./stat-remakes.widget";

export function DashboardStatsWidget() {
  const [range, setRange] = useState<SalesReportRange>("7d");

  return (
    <Box sx={{ gridColumn: "1 / -1" }}>
      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
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

        <ResponsiveGrid xs={1} sm={2} md={2} lg={4} xl={4}>
          <ActiveCasesStatWidget range={range} />
          <CasesCompletedStatWidget range={range} />
          <AvgTurnaroundStatWidget range={range} />
          <RemakesStatWidget range={range} />
        </ResponsiveGrid>
      </Stack>
    </Box>
  );
}

registerSlot({
  id: "dashboard-stat-overview",
  name: "dashboard:stat",
  render: () => <DashboardStatsWidget />,
  priority: 1,
});

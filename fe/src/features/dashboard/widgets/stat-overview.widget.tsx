import { Box } from "@mui/material";
import { useDashboardContext } from "@features/dashboard/context/dashboard-context";
import { registerSlot } from "@root/core/module/registry";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { ActiveCasesStatWidget } from "./stat-active-cases.widget";
import { AvgTurnaroundStatWidget } from "./stat-avg-turnaround.widget";
import { CasesCompletedStatWidget } from "./stat-cases-completed.widget";
import { RemakesStatWidget } from "./stat-remakes.widget";

export function DashboardStatsWidget() {
  const { range } = useDashboardContext();

  return (
    <Box sx={{ gridColumn: "1 / -1" }}>
      <ResponsiveGrid xs={1} sm={2} md={2} lg={4} xl={4}>
        <ActiveCasesStatWidget range={range} />
        <CasesCompletedStatWidget range={range} />
        <AvgTurnaroundStatWidget range={range} />
        <RemakesStatWidget range={range} />
      </ResponsiveGrid>
    </Box>
  );
}

registerSlot({
  id: "dashboard-stat-overview",
  name: "dashboard:stat",
  render: () => <DashboardStatsWidget />,
  priority: 1,
});

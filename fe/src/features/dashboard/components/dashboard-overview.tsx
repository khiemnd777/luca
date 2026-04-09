import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { SlotHost } from "@core/module/slot-host";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { Spacer } from "@shared/components/ui/spacer";
import { useDashboardContext } from "@features/dashboard/context/dashboard-context";

export function DashboardOverview() {
  const { range, setRange } = useDashboardContext();

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
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

      <ResponsiveGrid xs={1} sm={1} md={1} lg={1} xl={1}>
        <SlotHost name="dashboard:stat" />
      </ResponsiveGrid>

      <Spacer />

      <ResponsiveGrid xs={1} sm={1} md={1} lg={1} xl={1}>
        <SlotHost name="dashboard:line1" />
      </ResponsiveGrid>

      <Spacer />

      <ResponsiveGrid xs={1} sm={2} md={2} lg={2} xl={2}>
        <SlotHost name="dashboard:line2" />
      </ResponsiveGrid>

      <Spacer />

      <ResponsiveGrid xs={1} sm={1} md={1} lg={1} xl={1}>
        <SlotHost name="dashboard:line3" direction="column" />
      </ResponsiveGrid>
    </>
  );
}

import React from "react";
import { Box, Tab, Tabs, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { SlotHost } from "@core/module/slot-host";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { Spacer } from "@shared/components/ui/spacer";
import { useDashboardContext } from "@features/dashboard/context/dashboard-context";

type DashboardTab = "production" | "operations";

export function DashboardOverview() {
  const { range, setRange, showProductionPlanning } = useDashboardContext();
  const [tab, setTab] = React.useState<DashboardTab>("production");

  const operationsContent = (
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

  if (!showProductionPlanning) {
    return operationsContent;
  }

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, value: DashboardTab) => setTab(value)}
          aria-label="Dashboard sections"
        >
          <Tab value="production" label="Điều hành sản xuất" />
          <Tab value="operations" label="Vận hành" />
        </Tabs>
      </Box>

      {tab === "production" ? (
        <ResponsiveGrid xs={1} sm={1} md={1} lg={1} xl={1}>
          <SlotHost name="dashboard:top" />
        </ResponsiveGrid>
      ) : operationsContent}
    </>
  );
}

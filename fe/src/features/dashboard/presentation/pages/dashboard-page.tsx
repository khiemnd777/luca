import { Stack, Typography } from "@mui/material";
import { BasePage } from "@core/pages/base-page";
import { PageContainer } from "@shared/components/ui/page-container";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { Spacer } from "@shared/components/ui/spacer";
import { SlotHost } from "@core/module/slot-host";
import { formatDate } from "@root/shared/utils/datetime.utils";

export default function DashboardPage() {
  const now = new Date();
  const todayLabel = `Vận hành hôm nay · ${formatDate(now)}`;

  return (
    <BasePage>
      <PageContainer>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="body2" textTransform={"uppercase"} color="textPrimary">
            {todayLabel}
          </Typography>
        </Stack>

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

      </PageContainer>
    </BasePage>
  );
}

import { Stack, Typography } from "@mui/material";
import { BasePage } from "@core/pages/base-page";
import { PageContainer } from "@shared/components/ui/page-container";
import { DashboardOverview } from "@features/dashboard/components/dashboard-overview";
import { DashboardProvider } from "@features/dashboard/context/dashboard-context";
import { formatDate } from "@root/shared/utils/datetime.utils";

export default function DashboardPage() {
  const now = new Date();
  const todayLabel = `Vận hành hôm nay · ${formatDate(now)}`;

  return (
    <BasePage>
      <PageContainer>
        <DashboardProvider cacheNamespace="home">
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography variant="body2" textTransform={"uppercase"} color="textPrimary">
              {todayLabel}
            </Typography>
          </Stack>

          <DashboardOverview />
        </DashboardProvider>
      </PageContainer>
    </BasePage>
  );
}

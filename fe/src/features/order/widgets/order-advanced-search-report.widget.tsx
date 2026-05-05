import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Button,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { registerSlot } from "@root/core/module/registry";
import { useAsync } from "@root/core/hooks/use-async";
import { advancedSearchReportSummary } from "@features/order/api/order.api";
import type { OrderAdvancedSearchReportSummaryModel } from "@features/order/model/order-advanced-search.model";
import {
  serializeAdvancedSearchFilters,
  useOrderAdvancedSearchStore,
} from "@features/order/utils/order-advanced-search.store";
import { StatCard } from "@features/dashboard/components/stat-card";
import { SectionCard } from "@shared/components/ui/section-card";
import * as React from "react";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatCurrency(value?: number | null) {
  return currencyFormatter.format(Number(value ?? 0));
}

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function ReportErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <SectionCard title="Báo cáo đơn hàng">
      <Stack spacing={1.5} alignItems="flex-start">
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        <Button variant="outlined" size="small" startIcon={<RefreshRoundedIcon />} onClick={onRetry}>
          Tải lại
        </Button>
      </Stack>
    </SectionCard>
  );
}

function SummarySkeletonCards() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 6 }, (_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, lg: 2 }}>
          <SectionCard>
            <Stack spacing={1.5}>
              <Skeleton variant="text" width="45%" />
              <Skeleton variant="text" width="75%" height={36} />
              <Skeleton variant="text" width="60%" />
            </Stack>
          </SectionCard>
        </Grid>
      ))}
    </Grid>
  );
}

function OrderAdvancedSearchSummaryCards({
  data,
  refreshing,
}: {
  data: OrderAdvancedSearchReportSummaryModel;
  refreshing: boolean;
}) {
  return (
    <Stack spacing={1}>
      {refreshing ? <LinearProgress /> : null}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Tổng đơn"
            value={formatNumber(data.totalOrders)}
            caption="Tổng số đơn khớp bộ lọc"
            icon={<Inventory2RoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Tổng giá trị"
            value={formatCurrency(data.totalValue)}
            caption="Tổng giá trị đơn hàng"
            icon={<SummarizeRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Giá trị TB/đơn"
            value={formatCurrency(data.averageOrderValue)}
            caption="Bình quân trên mỗi đơn"
            icon={<AttachMoneyRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Số đơn làm lại"
            value={formatNumber(data.remakeOrders)}
            caption="Số đơn có remake count > 0"
            icon={<ReplayRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Tổng doanh số"
            value={formatCurrency(data.totalSales)}
            caption="Tổng giá trị bán ra"
            icon={<PaidRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Tổng doanh thu"
            value={formatCurrency(data.totalRevenue)}
            caption="Tạm tính theo giá trị đơn hàng"
            icon={<WalletRoundedIcon fontSize="small" />}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

function OrderAdvancedSearchReportWidget() {
  const appliedFilters = useOrderAdvancedSearchStore((state) => state.appliedFilters);
  const refreshToken = useOrderAdvancedSearchStore((state) => state.refreshToken);
  const serializedFilters = React.useMemo(
    () => serializeAdvancedSearchFilters(appliedFilters),
    [appliedFilters],
  );

  const summaryKey = `order-advanced-search-summary:${serializedFilters}:${refreshToken}`;

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    reload: reloadSummary,
  } = useAsync(
    () => advancedSearchReportSummary(appliedFilters),
    [serializedFilters, refreshToken],
    { key: summaryKey },
  );

  const summaryRefreshing = summaryLoading && Boolean(summary);

  if (summaryLoading && !summary) {
    return <SummarySkeletonCards />;
  }

  if (summaryError && !summary) {
    return (
      <ReportErrorState
        message="Không tải được thống kê tổng quan."
        onRetry={() => {
          void reloadSummary();
        }}
      />
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <OrderAdvancedSearchSummaryCards data={summary} refreshing={summaryRefreshing} />
    </Stack>
  );
}

registerSlot({
  id: "order-advanced-search-report",
  name: "order:header",
  priority: 90,
  render: () => <OrderAdvancedSearchReportWidget />,
});

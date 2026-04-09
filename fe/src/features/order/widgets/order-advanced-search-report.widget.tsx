import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Box,
  Button,
  Divider,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { registerSlot } from "@root/core/module/registry";
import { useAsync } from "@root/core/hooks/use-async";
import {
  advancedSearchReportBreakdown,
  advancedSearchReportSummary,
} from "@features/order/api/order.api";
import type {
  OrderAdvancedSearchReportBreakdownModel,
  OrderAdvancedSearchReportSummaryModel,
} from "@features/order/model/order-advanced-search.model";
import {
  serializeAdvancedSearchFilters,
  useOrderAdvancedSearchStore,
} from "@features/order/utils/order-advanced-search.store";
import { StatCard } from "@features/dashboard/components/stat-card";
import { SectionCard } from "@shared/components/ui/section-card";
import { statusLabel } from "@root/shared/utils/order.utils";
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

function BreakdownSkeletonSection({ title }: { title: string }) {
  return (
    <SectionCard title={title}>
      <Stack spacing={1.25}>
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="rectangular" height={10} />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="rectangular" height={10} />
        <Skeleton variant="text" width="55%" />
      </Stack>
    </SectionCard>
  );
}

function BreakdownErrorSection({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <SectionCard title={title}>
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

function OrderAdvancedSearchBreakdownSection({
  data,
  totalOrders,
  loading,
  refreshing,
  error,
  onRetry,
}: {
  data: OrderAdvancedSearchReportBreakdownModel | null | undefined;
  totalOrders: number;
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const statusBreakdown = data?.statusBreakdown ?? [];
  const topProducts = data?.topProducts ?? [];

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 6 }}>
        {loading && !data ? (
          <BreakdownSkeletonSection title="Phân bố trạng thái đơn" />
        ) : error && !data ? (
          <BreakdownErrorSection
            title="Phân bố trạng thái đơn"
            message="Không tải được dữ liệu phân tích chi tiết."
            onRetry={onRetry}
          />
        ) : (
          <SectionCard title="Phân bố trạng thái đơn">
            <Stack spacing={1.5}>
              {refreshing ? <LinearProgress /> : null}
              {statusBreakdown.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Không có dữ liệu trạng thái cho bộ lọc hiện tại.
                </Typography>
              ) : statusBreakdown.map((item) => {
                const percent = totalOrders > 0 ? (item.count / totalOrders) * 100 : 0;
                return (
                  <Box key={`${item.status}:${item.count}`}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {statusLabel(item.status) || item.status || "Chưa xác định"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatNumber(item.count)} đơn
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 99 }} />
                  </Box>
                );
              })}
            </Stack>
          </SectionCard>
        )}
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        {loading && !data ? (
          <BreakdownSkeletonSection title="Top 5 sản phẩm" />
        ) : error && !data ? (
          <BreakdownErrorSection
            title="Top 5 sản phẩm"
            message="Không tải được dữ liệu phân tích chi tiết."
            onRetry={onRetry}
          />
        ) : (
          <SectionCard title="Top 5 sản phẩm">
            <Stack spacing={1.25}>
              {refreshing ? <LinearProgress /> : null}
              {topProducts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Không có sản phẩm nào khớp bộ lọc hiện tại.
                </Typography>
              ) : topProducts.map((item, index) => (
                <Box key={`${item.productId ?? "unknown"}:${index}`}>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {[item.productCode, item.productName].filter(Boolean).join(" - ") || "Sản phẩm chưa xác định"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatNumber(item.orderCount)} đơn • {formatNumber(item.totalQuantity)} sản phẩm
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700}>
                      {formatCurrency(item.totalSales)}
                    </Typography>
                  </Stack>
                  {index < topProducts.length - 1 ? <Divider sx={{ mt: 1.25 }} /> : null}
                </Box>
              ))}
            </Stack>
          </SectionCard>
        )}
      </Grid>
    </Grid>
  );
}

function OrderAdvancedSearchReportWidget() {
  const appliedFilters = useOrderAdvancedSearchStore((state) => state.appliedFilters);
  const refreshToken = useOrderAdvancedSearchStore((state) => state.refreshToken);
  const serializedFilters = React.useMemo(
    () => serializeAdvancedSearchFilters(appliedFilters),
    [appliedFilters],
  );
  const [breakdownReadyToken, setBreakdownReadyToken] = React.useState(0);

  const summaryKey = `order-advanced-search-summary:${serializedFilters}:${refreshToken}`;
  const breakdownKey = `order-advanced-search-breakdown:${serializedFilters}:${refreshToken}:${breakdownReadyToken}`;

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

  const summarySettled = !summaryLoading && !summaryError && Boolean(summary);
  const summaryRefreshing = summaryLoading && Boolean(summary);

  React.useEffect(() => {
    setBreakdownReadyToken(0);

    if (!summarySettled) return;

    const timeoutId = window.setTimeout(() => {
      setBreakdownReadyToken((value) => value + 1);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [summarySettled, serializedFilters, refreshToken]);

  const {
    data: breakdown,
    loading: breakdownLoading,
    error: breakdownError,
    reload: reloadBreakdown,
  } = useAsync(
    async () => {
      if (!summarySettled || breakdownReadyToken <= 0) {
        return undefined;
      }
      return advancedSearchReportBreakdown(appliedFilters);
    },
    [serializedFilters, refreshToken, breakdownReadyToken, summarySettled],
    { key: breakdownKey },
  );

  const breakdownRefreshing = breakdownLoading && Boolean(breakdown);

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
      <OrderAdvancedSearchBreakdownSection
        data={breakdown}
        totalOrders={summary.totalOrders}
        loading={breakdownLoading}
        refreshing={breakdownRefreshing}
        error={breakdownError}
        onRetry={() => {
          void reloadBreakdown();
        }}
      />
    </Stack>
  );
}

registerSlot({
  id: "order-advanced-search-report",
  name: "order:header",
  priority: 90,
  render: () => <OrderAdvancedSearchReportWidget />,
});

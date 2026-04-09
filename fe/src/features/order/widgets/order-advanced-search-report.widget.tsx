import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import {
  Box,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { registerSlot } from "@root/core/module/registry";
import { useAsync } from "@root/core/hooks/use-async";
import { advancedSearchReport } from "@features/order/api/order.api";
import { useOrderAdvancedSearchStore } from "@features/order/utils/order-advanced-search.store";
import { StatCard } from "@features/dashboard/components/stat-card";
import { SectionCard } from "@shared/components/ui/section-card";
import { statusLabel } from "@root/shared/utils/order.utils";

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

function OrderAdvancedSearchReportWidget() {
  const appliedFilters = useOrderAdvancedSearchStore((state) => state.appliedFilters);
  const refreshToken = useOrderAdvancedSearchStore((state) => state.refreshToken);

  const { data, loading } = useAsync(
    () => advancedSearchReport(appliedFilters),
    [appliedFilters, refreshToken],
    { key: `order-advanced-search-report:${refreshToken}` },
  );

  const totalOrders = data?.totalOrders ?? 0;
  const statusBreakdown = data?.statusBreakdown ?? [];
  const topProducts = data?.topProducts ?? [];

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Tổng đơn"
            value={formatNumber(data?.totalOrders)}
            caption="Tổng số đơn khớp bộ lọc"
            icon={<Inventory2RoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Tổng giá trị"
            value={formatCurrency(data?.totalValue)}
            caption="Tổng giá trị đơn hàng"
            icon={<SummarizeRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Giá trị TB/đơn"
            value={formatCurrency(data?.averageOrderValue)}
            caption="Bình quân trên mỗi đơn"
            icon={<AttachMoneyRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Số đơn làm lại"
            value={formatNumber(data?.remakeOrders)}
            caption="Số đơn có remake count > 0"
            icon={<ReplayRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Tổng doanh số"
            value={formatCurrency(data?.totalSales)}
            caption="Tổng giá trị bán ra"
            icon={<PaidRoundedIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <StatCard
            title="Tổng doanh thu"
            value={formatCurrency(data?.totalRevenue)}
            caption="Tạm tính theo giá trị đơn hàng"
            icon={<WalletRoundedIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Phân bố trạng thái đơn">
            <Stack spacing={1.5}>
              {loading ? <LinearProgress /> : null}
              {!loading && statusBreakdown.length === 0 ? (
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
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Top 5 sản phẩm">
            <Stack spacing={1.25}>
              {loading ? <LinearProgress /> : null}
              {!loading && topProducts.length === 0 ? (
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
        </Grid>
      </Grid>
    </Stack>
  );
}

registerSlot({
  id: "order-advanced-search-report",
  name: "order:header",
  priority: 90,
  render: () => <OrderAdvancedSearchReportWidget />,
});

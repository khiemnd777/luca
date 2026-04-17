import * as React from "react";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import {
  alpha,
  Box,
  Button,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useAsync } from "@root/core/hooks/use-async";
import { catalogOverview as getCatalogOverview } from "@features/product/api/product.api";
import type {
  ProductCatalogOverviewModel,
  ProductCatalogOverviewOrderStatusBreakdownModel,
  ProductCatalogOverviewProcessLoadModel,
} from "@features/product/model/product-catalog-overview.model";
import { StatCard } from "@features/dashboard/components/stat-card";
import { SectionCard } from "@shared/components/ui/section-card";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { EmptyState } from "@shared/components/ui/empty-state";
import { statusColor, statusLabel } from "@shared/utils/order.utils";
import { useAuthStore } from "@store/auth-store";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const ORDER_STATUS_SEQUENCE = ["received", "in_progress", "qc", "rework", "completed"] as const;

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function buildNarrative(data: ProductCatalogOverviewModel) {
  const summary = data.summary;
  const coverage = data.coverage;
  const busiestProcess = data.processLoad[0]?.processName ?? "chưa xác định";

  return `${formatNumber(coverage.productsWithOrders)} trên ${formatNumber(coverage.totalCatalogProducts)} sản phẩm đã phát sinh đơn hàng. Hiện có ${formatNumber(summary.openOrders)} đơn mở với ${formatNumber(summary.openQuantity)} sản phẩm đang chạy, tải bottleneck tập trung nhiều nhất ở ${busiestProcess}.`;
}

function LoadingState() {
  return (
    <Stack spacing={2}>
      <SectionCard title="Tổng quan vận hành sản phẩm">
        <Stack spacing={1.25}>
          <Skeleton variant="text" width="36%" />
          <Skeleton variant="text" width="82%" />
        </Stack>
      </SectionCard>

      <ResponsiveGrid xs={1} sm={2} md={2} lg={4} xl={4}>
        {Array.from({ length: 4 }, (_, index) => (
          <SectionCard key={index} dense noDivider sx={{ height: "100%" }}>
            <Stack spacing={1.25}>
              <Skeleton variant="text" width="44%" />
              <Skeleton variant="text" width="68%" height={32} />
              <Skeleton variant="text" width="52%" />
            </Stack>
          </SectionCard>
        ))}
      </ResponsiveGrid>
    </Stack>
  );
}

function StatusBreakdownPanel({
  summary,
  statusBreakdown,
}: {
  summary: ProductCatalogOverviewModel["summary"];
  statusBreakdown: ProductCatalogOverviewOrderStatusBreakdownModel[];
}) {
  const statusMap = React.useMemo(() => {
    return statusBreakdown.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});
  }, [statusBreakdown]);

  return (
    <SectionCard title="Trạng thái đơn theo catalog" sx={{ height: "100%" }}>
      {summary.openOrders <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có đơn hàng đang mở để hiển thị phân bổ trạng thái.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {ORDER_STATUS_SEQUENCE.map((status) => {
            const count = statusMap[status] ?? 0;
            const percent = summary.openOrders > 0 ? (count / summary.openOrders) * 100 : 0;
            const color = statusColor(status);

            return (
              <Box key={status}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {statusLabel(status) || status}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatNumber(count)} đơn
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: alpha(color, 0.14),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: color,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </SectionCard>
  );
}

function ProcessLoadPanel({ processLoad }: { processLoad: ProductCatalogOverviewProcessLoadModel[] }) {
  return (
    <SectionCard title="Bottleneck công đoạn" sx={{ height: "100%" }}>
      {processLoad.length <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu công đoạn để phân tích.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {processLoad.slice(0, 5).map((item) => (
            <Box
              key={`${item.stepNumber}-${item.processName}`}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 1.25,
              }}
            >
              <Stack spacing={0.75}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2" fontWeight={700}>
                    Bước {item.stepNumber}: {item.processName || "Công đoạn"}
                  </Typography>
                  <Chip size="small" label={`${formatNumber(item.activeOrders)} đơn`} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {formatNumber(item.total)} checkpoint, {formatNumber(item.inProgress + item.qc + item.rework)} đang xử lý
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={item.total > 0 ? (item.inProgress + item.qc + item.rework) / item.total * 100 : 0}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: alpha("#1976d2", 0.14),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "#1976d2",
                    },
                  }}
                />
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

export function ProductInsightWidget() {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  const { data, error, loading, reload } = useAsync<ProductCatalogOverviewModel | null>(
    () => {
      if (!canViewOrder) return Promise.resolve(null);
      return getCatalogOverview();
    },
    [canViewOrder],
    { key: "product-catalog-overview" }
  );

  if (!canViewOrder) {
    return (
      <SectionCard title="Tổng quan vận hành sản phẩm">
        <EmptyState
          title="Không có quyền xem dữ liệu vận hành"
          description="Bạn cần quyền xem đơn hàng để theo dõi tải catalog và tiến trình gia công theo sản phẩm."
          icon={<LockOutlinedIcon fontSize="inherit" />}
        />
      </SectionCard>
    );
  }

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return (
      <SectionCard
        title="Tổng quan vận hành sản phẩm"
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          Không tải được insight catalog sản phẩm. Có thể thử tải lại để đồng bộ dữ liệu mới nhất.
        </Typography>
      </SectionCard>
    );
  }

  if (!data) return null;

  return (
    <Stack spacing={2}>
      <SectionCard
        title={(
          <Stack spacing={0.25}>
            <Typography variant="h6" fontWeight={700}>
              Tổng quan vận hành sản phẩm
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Góc nhìn tổng hợp để đọc nhanh mức độ phủ catalog trong đơn hàng và bottleneck gia công.
            </Typography>
          </Stack>
        )}
        extra={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={data.coverage.scopeLabel || "Catalog hiện tại"} sx={{ fontWeight: 600 }} />
            <Chip
              size="small"
              color="info"
              label={`${formatNumber(data.coverage.productsWithOrders)}/${formatNumber(data.coverage.totalCatalogProducts)} sản phẩm có đơn`}
            />
            <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
              Làm mới
            </Button>
          </Stack>
        )}
      >
        {loading ? <LinearProgress sx={{ mb: 2 }} /> : null}
        <Typography variant="body2" color="text.secondary">
          {buildNarrative(data)}
        </Typography>
      </SectionCard>

      <ResponsiveGrid xs={1} sm={2} md={2} lg={4} xl={4}>
        <StatCard
          title="Sản phẩm có đơn"
          value={formatNumber(data.coverage.productsWithOrders)}
          caption={`${formatNumber(data.coverage.totalCatalogProducts)} sản phẩm trong catalog`}
          delta={`${data.coverage.totalCatalogProducts > 0 ? Math.round((data.coverage.productsWithOrders / data.coverage.totalCatalogProducts) * 100) : 0}% phủ đơn`}
          tone="info"
          icon={<Inventory2RoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Đơn đang mở"
          value={formatNumber(data.summary.openOrders)}
          caption={`${formatNumber(data.summary.completedOrders)} đơn đã hoàn tất`}
          delta={`${formatNumber(data.summary.inProductionOrders)} đơn đang gia công`}
          tone="warning"
          icon={<LocalShippingOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="SL đang chạy"
          value={formatNumber(data.summary.openQuantity)}
          caption="Khối lượng sản phẩm đang mở"
          delta={`${formatNumber(data.summary.openProcesses)} công đoạn mở`}
          tone="default"
          icon={<CategoryRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tiến độ gia công"
          value={`${formatNumber(data.summary.completionPercent)}%`}
          caption={`${formatNumber(data.summary.lifetimeOrders)} đơn lịch sử`}
          delta={`${formatNumber(data.summary.remakeOrders)} đơn remake`}
          tone="success"
          icon={<ManufacturingRoundedIcon fontSize="small" />}
        />
      </ResponsiveGrid>

      <ResponsiveGrid xs={1} sm={1} md={1} lg={2} xl={2}>
        <StatusBreakdownPanel summary={data.summary} statusBreakdown={data.orderStatusBreakdown} />
        <ProcessLoadPanel processLoad={data.processLoad} />
      </ResponsiveGrid>
    </Stack>
  );
}

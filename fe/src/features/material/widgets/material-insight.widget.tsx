import * as React from "react";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useAsync } from "@root/core/hooks/use-async";
import { catalogOverview as getCatalogOverview } from "@features/material/api/material.api";
import type {
  MaterialCatalogOverviewMaterialStatusBreakdownModel,
  MaterialCatalogOverviewModel,
  MaterialCatalogOverviewOrderStatusBreakdownModel,
  MaterialCatalogOverviewProcessLoadModel,
} from "@features/material/model/material-catalog-overview.model";
import {
  materialStatusColor,
  materialStatusLabel,
} from "@features/material/utils/material.utils";
import { StatCard } from "@features/dashboard/components/stat-card";
import { SectionCard } from "@shared/components/ui/section-card";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { EmptyState } from "@shared/components/ui/empty-state";
import { statusColor, statusLabel } from "@shared/utils/order.utils";
import { useAuthStore } from "@store/auth-store";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const ORDER_STATUS_SEQUENCE = ["received", "in_progress", "qc", "rework"] as const;
const MATERIAL_STATUS_SEQUENCE = ["on_loan", "partial_returned", "returned"] as const;

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function buildNarrative(data: MaterialCatalogOverviewModel) {
  const summary = data.summary;
  const coverage = data.coverage;
  const busiestProcess = data.processLoad[0]?.processName ?? "chưa xác định";

  return `${formatNumber(coverage.materialsWithOrders)} trên ${formatNumber(coverage.totalCatalogMaterials)} vật tư đã phát sinh trên đơn hàng. Hiện có ${formatNumber(summary.onLoanQuantity)} đơn vị vật tư đang cho mượn, ${formatNumber(summary.openOrders)} đơn còn mở và bottleneck tập trung nhiều nhất ở ${busiestProcess}.`;
}

function LoadingState() {
  return (
    <Stack spacing={2}>
      <SectionCard title="Tổng quan vận hành vật tư">
        <Stack spacing={1.25}>
          <Skeleton variant="text" width="34%" />
          <Skeleton variant="text" width="84%" />
        </Stack>
      </SectionCard>

      <ResponsiveGrid xs={1} sm={2} md={2} lg={4} xl={4}>
        {Array.from({ length: 4 }, (_, index) => (
          <SectionCard key={index} dense noDivider sx={{ height: "100%" }}>
            <Stack spacing={1.25}>
              <Skeleton variant="text" width="42%" />
              <Skeleton variant="text" width="66%" height={32} />
              <Skeleton variant="text" width="58%" />
            </Stack>
          </SectionCard>
        ))}
      </ResponsiveGrid>
    </Stack>
  );
}

function OrderStatusPanel({
  summary,
  statusBreakdown,
}: {
  summary: MaterialCatalogOverviewModel["summary"];
  statusBreakdown: MaterialCatalogOverviewOrderStatusBreakdownModel[];
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
          Chưa có đơn mở chứa vật tư để hiển thị phân bổ trạng thái.
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

function MaterialStatusPanel({
  breakdown,
}: {
  breakdown: MaterialCatalogOverviewMaterialStatusBreakdownModel[];
}) {
  const total = React.useMemo(
    () => breakdown.reduce((sum, item) => sum + Number(item.count ?? 0), 0),
    [breakdown]
  );
  const statusMap = React.useMemo(() => {
    return breakdown.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});
  }, [breakdown]);

  return (
    <SectionCard title="Trạng thái vật tư" sx={{ height: "100%" }}>
      {total <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu mượn hoặc thu hồi cho catalog vật tư.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {MATERIAL_STATUS_SEQUENCE.map((status) => {
            const count = statusMap[status] ?? 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            const color = materialStatusColor(status);

            return (
              <Box key={status}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {materialStatusLabel(status) || status}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatNumber(count)} bản ghi
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

function ProcessLoadPanel({ processLoad }: { processLoad: MaterialCatalogOverviewProcessLoadModel[] }) {
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
                  value={item.total > 0 ? ((item.inProgress + item.qc + item.rework) / item.total) * 100 : 0}
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

export function MaterialInsightWidget() {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  const { data, error, loading, reload } = useAsync<MaterialCatalogOverviewModel | null>(
    () => {
      if (!canViewOrder) return Promise.resolve(null);
      return getCatalogOverview();
    },
    [canViewOrder],
    { key: "material-catalog-overview" }
  );

  if (!canViewOrder) {
    return (
      <SectionCard title="Tổng quan vận hành vật tư">
        <EmptyState
          title="Không có quyền xem dữ liệu vận hành"
          description="Bạn cần quyền xem đơn hàng để theo dõi tình trạng cho mượn và tải vận hành của vật tư."
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
        title="Tổng quan vận hành vật tư"
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          Không tải được insight catalog vật tư. Có thể thử tải lại để đồng bộ dữ liệu mới nhất.
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
              Tổng quan vận hành vật tư
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Góc nhìn tổng hợp để đọc nhanh độ phủ vật tư trên đơn hàng, trạng thái cho mượn và bottleneck công đoạn.
            </Typography>
          </Stack>
        )}
        extra={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={data.coverage.scopeLabel || "Catalog hiện tại"} sx={{ fontWeight: 600 }} />
            <Chip
              size="small"
              color="info"
              label={`${formatNumber(data.coverage.materialsWithOrders)}/${formatNumber(data.coverage.totalCatalogMaterials)} vật tư có đơn`}
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
          title="Vật tư có đơn"
          value={formatNumber(data.coverage.materialsWithOrders)}
          caption={`${formatNumber(data.coverage.totalCatalogMaterials)} vật tư trong catalog`}
          delta={`${data.coverage.totalCatalogMaterials > 0 ? Math.round((data.coverage.materialsWithOrders / data.coverage.totalCatalogMaterials) * 100) : 0}% phủ đơn`}
          tone="info"
          icon={<Inventory2RoundedIcon fontSize="small" />}
        />
        <StatCard
          title="SL đang mượn"
          value={formatNumber(data.summary.onLoanQuantity)}
          caption={`${formatNumber(data.summary.returnedOrders)} đơn đã thu hồi`}
          delta={`${formatNumber(data.summary.partialReturnedOrders)} đơn thu hồi một phần`}
          tone="warning"
          icon={<InsightsRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Đơn đang mở"
          value={formatNumber(data.summary.openOrders)}
          caption={`${formatNumber(data.summary.inProductionOrders)} đơn còn chạy trong xưởng`}
          delta={`${formatNumber(data.summary.openProcesses)} công đoạn mở`}
          tone="default"
          icon={<PrecisionManufacturingRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tiến độ gia công"
          value={`${formatNumber(data.summary.completionPercent)}%`}
          caption={`${formatNumber(data.summary.lifetimeOrders)} đơn lịch sử`}
          delta="Theo các đơn có phát sinh vật tư"
          tone="success"
          icon={<HistoryRoundedIcon fontSize="small" />}
        />
      </ResponsiveGrid>

      <ResponsiveGrid xs={1} sm={1} md={1} lg={3} xl={3}>
        <OrderStatusPanel summary={data.summary} statusBreakdown={data.orderStatusBreakdown} />
        <MaterialStatusPanel breakdown={data.materialStatusBreakdown} />
        <ProcessLoadPanel processLoad={data.processLoad} />
      </ResponsiveGrid>
    </Stack>
  );
}

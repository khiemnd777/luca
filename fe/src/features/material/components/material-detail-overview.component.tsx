import * as React from "react";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
  LinearProgress,
  Skeleton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useAsync } from "@root/core/hooks/use-async";
import { useAuthStore } from "@store/auth-store";
import { overview as getOverview } from "@features/material/api/material.api";
import type {
  MaterialOverviewMaterialStatusBreakdownModel,
  MaterialOverviewModel,
  MaterialOverviewProcessLoadModel,
  MaterialOverviewRecentOrderModel,
} from "@features/material/model/material-overview.model";
import {
  materialStatusColor,
  materialStatusLabel,
} from "@features/material/utils/material.utils";
import { SectionCard } from "@shared/components/ui/section-card";
import { ResponsiveGrid } from "@root/shared/components/ui/responsive-grid";
import { StatCard } from "@features/dashboard/components/stat-card";
import { EmptyState } from "@shared/components/ui/empty-state";
import { formatDateTime, relTime } from "@root/shared/utils/datetime.utils";
import { statusColor, statusLabel } from "@root/shared/utils/order.utils";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const ORDER_STATUS_SEQUENCE = ["received", "in_progress", "qc", "rework"] as const;
const MATERIAL_STATUS_SEQUENCE = ["on_loan", "partial_returned", "returned"] as const;

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function loadingSkeletonCards() {
  return (
    <ResponsiveGrid xs={1} sm={2} md={3} lg={3} xl={6}>
      {Array.from({ length: 6 }, (_, index) => (
        <SectionCard key={index} dense noDivider sx={{ height: "100%" }}>
          <Stack spacing={1.25}>
            <Skeleton variant="text" width="45%" />
            <Skeleton variant="text" width="75%" height={34} />
            <Skeleton variant="text" width="55%" />
          </Stack>
        </SectionCard>
      ))}
    </ResponsiveGrid>
  );
}

function StatSummarySection({ data }: { data: MaterialOverviewModel }) {
  const summary = data.summary;
  const scope = data.scope;

  return (
    <SectionCard
      title="Tóm tắt nhanh"
      extra={(
        <Chip
          size="small"
          label={scope.scopeLabel || "Vật tư đang theo dõi"}
          sx={{ fontWeight: 600 }}
        />
      )}
    >
      <ResponsiveGrid xs={1} sm={2} md={3} lg={3} xl={6}>
        <StatCard
          title="Đang trong đơn"
          value={formatNumber(summary.openOrders)}
          caption={`${formatNumber(summary.returnedOrders)} đơn đã thu hồi`}
          icon={<InsightsRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Đơn đang gia công"
          value={formatNumber(summary.inProductionOrders)}
          caption="Đơn còn chạy trong xưởng"
          icon={<PrecisionManufacturingRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="SL đang mượn"
          value={formatNumber(summary.onLoanQuantity)}
          caption={`${formatNumber(summary.partialReturnedOrders)} đơn thu hồi một phần`}
          icon={<Inventory2RoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Công đoạn đang mở"
          value={formatNumber(summary.openProcesses)}
          caption="Tổng bước chưa hoàn tất"
          icon={<TimelineRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tiến độ gia công"
          value={`${formatNumber(summary.completionPercent)}%`}
          caption="Theo các đơn còn mở"
          icon={<PrecisionManufacturingRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tổng đơn lịch sử"
          value={formatNumber(summary.lifetimeOrders)}
          caption="Tổng số đơn từng dùng vật tư này"
          icon={<HistoryRoundedIcon fontSize="small" />}
        />
      </ResponsiveGrid>
    </SectionCard>
  );
}

function OrderStatusSection({
  summary,
  statusBreakdown,
}: {
  summary: MaterialOverviewModel["summary"];
  statusBreakdown: MaterialOverviewModel["orderStatusBreakdown"];
}) {
  const statusMap = React.useMemo(() => {
    return statusBreakdown.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});
  }, [statusBreakdown]);

  return (
    <SectionCard title="Trạng thái đơn hiện tại">
      <Stack spacing={1.5}>
        {ORDER_STATUS_SEQUENCE.map((status) => {
          const count = statusMap[status] ?? 0;
          const percent = summary.openOrders > 0 ? (count / summary.openOrders) * 100 : 0;
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
                  bgcolor: alpha(statusColor(status), 0.14),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: statusColor(status),
                  },
                }}
              />
            </Box>
          );
        })}
        {summary.openOrders === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Không có đơn đang mở chứa vật tư này.
          </Typography>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

function MaterialStatusSection({
  breakdown,
}: {
  breakdown: MaterialOverviewMaterialStatusBreakdownModel[];
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
    <SectionCard title="Trạng thái vật tư">
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
        {total === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Chưa có dữ liệu mượn hoặc thu hồi cho vật tư này.
          </Typography>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

function processMetricColor(key: "waiting" | "inProgress" | "qc" | "rework" | "completed") {
  switch (key) {
    case "waiting":
      return statusColor("received");
    case "inProgress":
      return statusColor("in_progress");
    case "qc":
      return statusColor("qc");
    case "rework":
      return statusColor("rework");
    case "completed":
      return statusColor("completed");
  }
}

function ProcessMetricChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Chip
      size="small"
      label={`${label}: ${formatNumber(value)}`}
      sx={{
        bgcolor: alpha(color, 0.12),
        color,
        fontWeight: 600,
      }}
    />
  );
}

function ProcessLoadRow({ item }: { item: MaterialOverviewProcessLoadModel }) {
  const completionPercent = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Stack spacing={0.5}>
            <Typography fontWeight={700}>
              Bước {item.stepNumber}: {item.processName || "Công đoạn"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatNumber(item.activeOrders)} đơn đang chạm công đoạn này
            </Typography>
          </Stack>
          <Typography variant="body2" fontWeight={700}>
            Hoàn thành {completionPercent}%
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={completionPercent}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: alpha(statusColor("completed"), 0.12),
            "& .MuiLinearProgress-bar": {
              bgcolor: statusColor("completed"),
            },
          }}
        />

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <ProcessMetricChip label="Chờ" value={item.waiting} color={processMetricColor("waiting")} />
          <ProcessMetricChip label="Gia công" value={item.inProgress} color={processMetricColor("inProgress")} />
          <ProcessMetricChip label="QC" value={item.qc} color={processMetricColor("qc")} />
          <ProcessMetricChip label="Làm lại" value={item.rework} color={processMetricColor("rework")} />
          <ProcessMetricChip label="Xong" value={item.completed} color={processMetricColor("completed")} />
        </Stack>
      </Stack>
    </Box>
  );
}

function ProcessLoadSection({
  processLoad,
}: {
  processLoad: MaterialOverviewProcessLoadModel[];
}) {
  return (
    <SectionCard title="Tải gia công theo công đoạn">
      {processLoad.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu công đoạn để phân tích.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {processLoad.map((item, index) => (
            <React.Fragment key={`${item.stepNumber}-${item.processName}-${index}`}>
              <ProcessLoadRow item={item} />
            </React.Fragment>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function RecentOrderRow({
  item,
  onOpen,
}: {
  item: MaterialOverviewRecentOrderModel;
  onOpen: (item: MaterialOverviewRecentOrderModel) => void;
}) {
  const orderTone = statusColor(item.status);
  const materialTone = materialStatusColor(item.materialStatus);
  const latestRelative = item.latestCheckpointAt ? relTime(item.latestCheckpointAt).text : "";
  const latestLabel = item.latestCheckpointAt
    ? latestRelative
      ? `${formatDateTime(item.latestCheckpointAt)} (${latestRelative})`
      : formatDateTime(item.latestCheckpointAt)
    : "Chưa có checkpoint";

  return (
    <Box
      onClick={() => onOpen(item)}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        cursor: "pointer",
        transition: "border-color 120ms ease, transform 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.25}>
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={700}>
              {item.orderItemCode || item.orderCode || `#${item.orderItemId}`}
            </Typography>
            <Chip
              size="small"
              label={statusLabel(item.status) || item.status || "Chưa rõ"}
              sx={{
                bgcolor: alpha(orderTone, 0.12),
                color: orderTone,
                fontWeight: 600,
              }}
            />
            <Chip
              size="small"
              label={materialStatusLabel(item.materialStatus) || item.materialStatus || "Chưa rõ"}
              sx={{
                bgcolor: alpha(materialTone, 0.12),
                color: materialTone,
                fontWeight: 600,
              }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {item.currentProcessName || "Chưa xác định công đoạn hiện tại"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.clinicName || "Chưa có nha khoa"}{item.patientName ? ` • ${item.patientName}` : ""}
          </Typography>
        </Stack>

        <Stack spacing={0.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
          <Typography variant="body2" fontWeight={700}>
            SL: {formatNumber(item.quantity)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {latestLabel}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function RecentOrdersSection({
  recentOrders,
}: {
  recentOrders: MaterialOverviewRecentOrderModel[];
}) {
  const navigate = useNavigate();

  return (
    <SectionCard title="Đơn liên quan">
      {recentOrders.length === 0 ? (
        <EmptyState
          title="Chưa có đơn liên quan"
          description="Vật tư này chưa xuất hiện trong đơn hàng nào để hiển thị gần đây."
        />
      ) : (
        <Stack spacing={1.25}>
          {recentOrders.map((item, index) => (
            <React.Fragment key={`${item.orderId}-${item.orderItemId}-${index}`}>
              <RecentOrderRow
                item={item}
                onOpen={(target) => navigate(`/order/${target.orderId}/historical/${target.orderItemId}`)}
              />
            </React.Fragment>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function OverviewErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <SectionCard title="Tổng quan vận hành">
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

export function MaterialDetailOverview({
  materialId,
}: {
  materialId?: number;
}) {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  const { data, loading, error, reload } = useAsync<MaterialOverviewModel | null>(
    () => {
      if (!materialId || !canViewOrder) return Promise.resolve(null);
      return getOverview(materialId);
    },
    [materialId, canViewOrder],
    {
      key: `material-detail-overview:${materialId ?? "new"}`,
    }
  );

  const errorStatus = React.useMemo(() => {
    if (!error || typeof error !== "object" || !("response" in error)) return undefined;
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }, [error]);

  const isForbidden = errorStatus === 403;
  const hasData = Boolean(
    data?.summary?.lifetimeOrders ||
    data?.processLoad?.length ||
    data?.recentOrders?.length ||
    data?.materialStatusBreakdown?.length
  );

  if (!canViewOrder || isForbidden) {
    return (
      <SectionCard title="Tổng quan vận hành">
        <EmptyState
          title="Không có quyền xem dữ liệu vận hành"
          description="Bạn cần quyền xem đơn hàng để theo dõi tải gia công và các đơn liên quan của vật tư này."
          icon={<LockOutlinedIcon fontSize="inherit" />}
        />
      </SectionCard>
    );
  }

  if (error && !data) {
    return (
      <OverviewErrorState
        message="Không tải được insight vận hành của vật tư."
        onRetry={() => void reload()}
      />
    );
  }

  if (loading && !data) {
    return loadingSkeletonCards();
  }

  if (!data) {
    return (
      <SectionCard title="Tổng quan vận hành">
        <EmptyState
          title="Chưa có dữ liệu"
          description="Không có dữ liệu tổng quan cho vật tư này."
        />
      </SectionCard>
    );
  }

  return (
    <Stack spacing={2}>
      <StatSummarySection data={data} />
      {!hasData ? (
        <SectionCard title="Tổng quan vận hành">
          <EmptyState
            title="Vật tư chưa có dữ liệu vận hành"
            description="Chưa có đơn hàng hoặc công đoạn phát sinh cho vật tư này trong hệ thống."
          />
        </SectionCard>
      ) : (
        <>
          <OrderStatusSection summary={data.summary} statusBreakdown={data.orderStatusBreakdown} />
          <MaterialStatusSection breakdown={data.materialStatusBreakdown} />
          <ProcessLoadSection processLoad={data.processLoad} />
          <RecentOrdersSection recentOrders={data.recentOrders} />
        </>
      )}
    </Stack>
  );
}

import * as React from "react";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
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
import { useNavigate } from "react-router-dom";
import { useAsync } from "@root/core/hooks/use-async";
import { overview as getOverview } from "@features/section/api/section.api";
import type {
  SectionOverviewModel,
  SectionOverviewProcessLoadModel,
  SectionOverviewRecentOrderModel,
} from "@features/section/model/section-overview.model";
import { StatCard } from "@features/dashboard/components/stat-card";
import { EmptyState } from "@shared/components/ui/empty-state";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { SectionCard } from "@shared/components/ui/section-card";
import { formatDateTime, relTime } from "@shared/utils/datetime.utils";
import { statusColor, statusLabel } from "@shared/utils/order.utils";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const ORDER_STATUS_SEQUENCE = ["received", "in_progress", "qc", "rework"] as const;

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function LoadingState() {
  return (
    <Stack spacing={2}>
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
    </Stack>
  );
}

function StatSummarySection({ data }: { data: SectionOverviewModel }) {
  const summary = data.summary;

  return (
    <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
      <StatCard
        title="Đang trong đơn"
        value={formatNumber(summary.openOrders)}
        caption={`${formatNumber(summary.completedOrders)} đơn đã hoàn thành`}
        icon={<AssignmentOutlinedIcon fontSize="small" />}
      />
      <StatCard
        title="Đơn đang gia công"
        value={formatNumber(summary.inProductionOrders)}
        caption="Đơn còn chạy qua phòng ban này"
        icon={<PrecisionManufacturingRoundedIcon fontSize="small" />}
      />
      <StatCard
        title="Công đoạn đang mở"
        value={formatNumber(summary.openProcesses)}
        caption="Khối lượng việc chưa hoàn tất"
        icon={<TimelineRoundedIcon fontSize="small" />}
      />
      <StatCard
        title="Tiến độ xử lý"
        value={`${formatNumber(summary.completionPercent)}%`}
        caption="Tỷ lệ checkpoint đã hoàn tất"
        icon={<InsightsRoundedIcon fontSize="small" />}
      />
      <StatCard
        title="Tổng đơn lịch sử"
        value={formatNumber(summary.lifetimeOrders)}
        caption={`${formatNumber(summary.remakeOrders)} đơn làm lại`}
        icon={<HistoryRoundedIcon fontSize="small" />}
      />
    </ResponsiveGrid>
  );
}

function OrderStatusSection({
  summary,
  statusBreakdown,
}: {
  summary: SectionOverviewModel["summary"];
  statusBreakdown: SectionOverviewModel["orderStatusBreakdown"];
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
            Không có đơn đang mở đi qua phòng ban này.
          </Typography>
        ) : null}
      </Stack>
    </SectionCard>
  );
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

function ProcessLoadRow({ item }: { item: SectionOverviewProcessLoadModel }) {
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
              {formatNumber(item.activeOrders)} đơn đang đi qua công đoạn này
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
          <ProcessMetricChip label="Chờ" value={item.waiting} color={statusColor("received")} />
          <ProcessMetricChip label="Gia công" value={item.inProgress} color={statusColor("in_progress")} />
          <ProcessMetricChip label="QC" value={item.qc} color={statusColor("qc")} />
          <ProcessMetricChip label="Làm lại" value={item.rework} color={statusColor("rework")} />
          <ProcessMetricChip label="Xong" value={item.completed} color={statusColor("completed")} />
        </Stack>
      </Stack>
    </Box>
  );
}

function ProcessLoadSection({ processLoad }: { processLoad: SectionOverviewProcessLoadModel[] }) {
  return (
    <SectionCard title="Tiến độ theo công đoạn">
      {processLoad.length <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu công đoạn để phân tích cho phòng ban này.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {processLoad.map((item) => (
            <ProcessLoadRow key={`${item.stepNumber}-${item.processName}`} item={item} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function RecentOrderRow({ item }: { item: SectionOverviewRecentOrderModel }) {
  const navigate = useNavigate();

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/order/${item.orderId}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/order/${item.orderId}`);
        }
      }}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        cursor: "pointer",
        transition: "border-color 120ms ease, background-color 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          bgcolor: alpha("#1976d2", 0.03),
        },
      }}
    >
      <Stack spacing={1}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Stack spacing={0.35}>
            <Typography fontWeight={700}>
              {item.orderCode || `Đơn #${item.orderId}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.clinicName || "Chưa có nha khoa"}{item.patientName ? ` • ${item.patientName}` : ""}
            </Typography>
          </Stack>
          <Chip
            size="small"
            label={statusLabel(item.status || "") || item.status || "Đang theo dõi"}
            sx={{
              alignSelf: { xs: "flex-start", sm: "center" },
              bgcolor: alpha(statusColor(item.status || "received"), 0.12),
              color: statusColor(item.status || "received"),
              fontWeight: 600,
            }}
          />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {item.currentProcessName || "Chưa xác định công đoạn hiện tại"}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          {item.latestCheckpointAt
            ? `${formatDateTime(item.latestCheckpointAt)} (${relTime(item.latestCheckpointAt)})`
            : "Chưa có checkpoint gần nhất"}
        </Typography>
      </Stack>
    </Box>
  );
}

function RecentOrdersSection({ recentOrders }: { recentOrders: SectionOverviewRecentOrderModel[] }) {
  return (
    <SectionCard title="Đơn cập nhật gần đây">
      {recentOrders.length <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có đơn hàng gần đây đi qua phòng ban này.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {recentOrders.map((item) => (
            <RecentOrderRow key={`${item.orderId}-${item.latestCheckpointAt ?? "recent"}`} item={item} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

export function SectionDetailOverview({ sectionId }: { sectionId: number }) {
  const { data, loading, error, reload } = useAsync<SectionOverviewModel | null>(
    () => {
      if (!sectionId) return Promise.resolve(null);
      return getOverview(sectionId);
    },
    [sectionId],
    { key: `section-overview:${sectionId || "empty"}` }
  );

  if (!sectionId) {
    return (
      <SectionCard title="Tổng quan phòng ban">
        <EmptyState
          title="Chưa xác định phòng ban"
          description="Không tìm thấy mã phòng ban để tải dữ liệu insight."
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
        title="Tổng quan phòng ban"
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          Không tải được insight vận hành cho phòng ban này. Có thể thử tải lại để đồng bộ dữ liệu mới nhất.
        </Typography>
      </SectionCard>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <SectionCard
        title={(
          <Stack spacing={0.25}>
            <Typography variant="h6" fontWeight={700}>
              {data.scope.sectionName || "Tổng quan phòng ban"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.scope.leaderName
                ? `Theo dõi workload đơn hàng và bottleneck công đoạn của phòng ban do ${data.scope.leaderName} phụ trách.`
                : "Theo dõi workload đơn hàng và bottleneck công đoạn của phòng ban này."}
            </Typography>
          </Stack>
        )}
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          {`${formatNumber(data.summary.openOrders)} đơn đang mở, ${formatNumber(data.summary.openProcesses)} công đoạn chưa hoàn tất và ${formatNumber(data.summary.inProductionOrders)} đơn đang trong nhịp gia công chính.`}
        </Typography>
      </SectionCard>

      <StatSummarySection data={data} />

      <ResponsiveGrid xs={1} md={2} lg={3} xl={3}>
        <OrderStatusSection summary={data.summary} statusBreakdown={data.orderStatusBreakdown} />
        <RecentOrdersSection recentOrders={data.recentOrders} />
        <ProcessLoadSection processLoad={data.processLoad} />
      </ResponsiveGrid>
    </Stack>
  );
}

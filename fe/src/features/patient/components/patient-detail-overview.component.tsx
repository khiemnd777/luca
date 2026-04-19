import * as React from "react";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LocalHospitalOutlinedIcon from "@mui/icons-material/LocalHospitalOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import { alpha, Box, Button, Chip, LinearProgress, Skeleton, Stack, Typography } from "@mui/material";
import { useAsync } from "@root/core/hooks/use-async";
import { navigate } from "@root/core/navigation/navigate";
import { overview as getOverview } from "@features/patient/api/patient.api";
import type { PatientOverviewModel, PatientOverviewProcessLoadModel, PatientOverviewRecentOrderModel } from "@features/patient/model/patient-overview.model";
import { StatCard } from "@features/dashboard/components/stat-card";
import { EmptyState } from "@shared/components/ui/empty-state";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { SectionCard } from "@shared/components/ui/section-card";
import { formatDateTime, relTime } from "@shared/utils/datetime.utils";
import { statusColor, statusLabel } from "@shared/utils/order.utils";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const ORDER_STATUS_SEQUENCE = ["received", "in_progress", "qc", "rework", "completed"] as const;

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function LoadingState() {
  return (
    <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
      {Array.from({ length: 5 }, (_, index) => (
        <SectionCard key={index} dense noDivider sx={{ height: "100%" }}>
          <Stack spacing={1.25}>
            <Skeleton variant="text" width="45%" />
            <Skeleton variant="text" width="70%" height={32} />
            <Skeleton variant="text" width="52%" />
          </Stack>
        </SectionCard>
      ))}
    </ResponsiveGrid>
  );
}

function OrderStatusPanel({
  summary,
  statusBreakdown,
}: {
  summary: PatientOverviewModel["summary"];
  statusBreakdown: PatientOverviewModel["orderStatusBreakdown"];
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
          const percent = summary.lifetimeOrders > 0 ? (count / summary.lifetimeOrders) * 100 : 0;
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
                  "& .MuiLinearProgress-bar": { bgcolor: statusColor(status) },
                }}
              />
            </Box>
          );
        })}
        {summary.lifetimeOrders === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Chưa có đơn hàng nào gắn với bệnh nhân này.
          </Typography>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

function ProcessLoadRow({ item }: { item: PatientOverviewProcessLoadModel }) {
  const completionPercent = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
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
            Hoàn thành {formatNumber(completionPercent)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={completionPercent}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: alpha(statusColor("completed"), 0.12),
            "& .MuiLinearProgress-bar": { bgcolor: statusColor("completed") },
          }}
        />
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={`Chờ: ${formatNumber(item.waiting)}`} />
          <Chip size="small" label={`Gia công: ${formatNumber(item.inProgress)}`} />
          <Chip size="small" label={`QC: ${formatNumber(item.qc)}`} />
          <Chip size="small" label={`Làm lại: ${formatNumber(item.rework)}`} />
          <Chip size="small" label={`Xong: ${formatNumber(item.completed)}`} />
        </Stack>
      </Stack>
    </Box>
  );
}

function RecentOrderRow({ item }: { item: PatientOverviewRecentOrderModel }) {
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
      <Stack spacing={0.75}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" fontWeight={700}>
            {item.orderCode || `Đơn #${item.orderId}`}
          </Typography>
          <Chip size="small" label={statusLabel(item.status) || item.status || "Không rõ"} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {item.clinicName || "Chưa có nha khoa"} • {item.dentistName || "Chưa có nha sĩ"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.currentProcessName || "Chưa xác định công đoạn"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.latestCheckpointAt ? `${formatDateTime(item.latestCheckpointAt)} (${relTime(item.latestCheckpointAt)})` : "Chưa có checkpoint gần đây"}
        </Typography>
      </Stack>
    </Box>
  );
}

export function PatientDetailOverview({ patientId }: { patientId: number }) {
  const { data, error, loading, reload } = useAsync<PatientOverviewModel | null>(
    () => {
      if (!patientId) return Promise.resolve(null);
      return getOverview(patientId);
    },
    [patientId],
    { key: `patient-overview:${patientId || "empty"}` }
  );

  if (loading && !data) return <LoadingState />;

  if (error && !data) {
    return (
      <SectionCard
        title="Tổng quan bệnh nhân"
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          Không tải được insight của bệnh nhân này. Có thể thử tải lại để đồng bộ dữ liệu mới nhất.
        </Typography>
      </SectionCard>
    );
  }

  if (!data) {
    return (
      <SectionCard title="Tổng quan bệnh nhân">
        <EmptyState
          title="Chưa có dữ liệu tổng quan"
          description="Bệnh nhân này chưa phát sinh dữ liệu vận hành để hiển thị."
        />
      </SectionCard>
    );
  }

  return (
    <Stack spacing={2}>
      <SectionCard
        title={(
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={700}>
              {data.scope.patientName || `Bệnh nhân #${data.scope.patientId}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.scope.scopeLabel}
              {data.scope.phoneNumber ? ` • ${data.scope.phoneNumber}` : ""}
              {` • ${formatNumber(data.scope.clinicCount)} nha khoa liên quan`}
            </Typography>
          </Stack>
        )}
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Làm mới
          </Button>
        )}
      >
        {loading ? <LinearProgress sx={{ mb: 2 }} /> : null}
        <Typography variant="body2" color="text.secondary">
          Bệnh nhân này hiện có {formatNumber(data.summary.openOrders)} đơn mở, {formatNumber(data.summary.inProductionOrders)} đơn đang gia công và {formatNumber(data.summary.completedOrders)} đơn đã hoàn thành.
        </Typography>
      </SectionCard>

      <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
        <StatCard
          title="Đơn đang mở"
          value={formatNumber(data.summary.openOrders)}
          caption={`${formatNumber(data.summary.completedOrders)} đơn đã hoàn thành`}
          icon={<AssignmentOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Đơn đang gia công"
          value={formatNumber(data.summary.inProductionOrders)}
          caption={`${formatNumber(data.summary.remakeOrders)} đơn làm lại`}
          icon={<TimelineRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tiến độ xử lý"
          value={`${formatNumber(data.summary.completionPercent)}%`}
          caption="Theo checkpoint của các đơn đã gắn bệnh nhân"
          icon={<LocalHospitalOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Tổng đơn lịch sử"
          value={formatNumber(data.summary.lifetimeOrders)}
          caption={`${formatNumber(data.scope.clinicCount)} nha khoa liên quan`}
          icon={<HistoryRoundedIcon fontSize="small" />}
        />
      </ResponsiveGrid>

      <ResponsiveGrid xs={1} md={2} lg={2} xl={2}>
        <OrderStatusPanel summary={data.summary} statusBreakdown={data.orderStatusBreakdown} />
        <SectionCard title="Điểm nghẽn công đoạn" sx={{ height: "100%" }}>
          {data.processLoad.length <= 0 ? (
            <Typography variant="body2" color="text.secondary">
              Chưa có dữ liệu công đoạn để phân tích bottleneck.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {data.processLoad.map((item) => (
                <ProcessLoadRow key={`${item.processName}-${item.stepNumber}`} item={item} />
              ))}
            </Stack>
          )}
        </SectionCard>
      </ResponsiveGrid>

      <SectionCard title="Đơn gần đây">
        {data.recentOrders.length <= 0 ? (
          <Typography variant="body2" color="text.secondary">
            Chưa có đơn hàng nào để hiển thị gần đây.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {data.recentOrders.map((item) => (
              <RecentOrderRow key={item.orderId} item={item} />
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}

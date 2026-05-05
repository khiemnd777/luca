import * as React from "react";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import WorkHistoryOutlinedIcon from "@mui/icons-material/WorkHistoryOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import { alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { useAsync } from "@root/core/hooks/use-async";
import { registerSlot } from "@root/core/module/registry";
import { ResponsiveGrid } from "@root/shared/components/ui/responsive-grid";
import { EmptyState } from "@shared/components/ui/empty-state";
import { SectionCard } from "@shared/components/ui/section-card";
import { formatDateTime, formatDuration, formatTimeAgo } from "@shared/utils/datetime.utils";
import { prefixCurrency } from "@shared/utils/currency.utils";
import { useAuthStore } from "@store/auth-store";
import { id as getStaffById } from "@features/staff/api/staff.api";
import type { StaffModel } from "@features/staff/model/staff.model";
import { processesForStaff, getInProgressesForStaffTimeline } from "@features/order/api/order-item-process.api";
import { getStaffOverview } from "@features/order/api/order.api";
import { StaffThroughputChart } from "@features/order/components/staff-throughput-chart.component";
import { StatCard } from "@features/dashboard/components/stat-card";
import type { OrderItemProcessInProgressProcessModel } from "@features/order/model/order-item-process-inprogress-process.model";
import type { OrderItemProcessModel } from "@features/order/model/order-item-process.model";
import type { StaffOverviewModel } from "@features/order/model/staff-overview.model";
import { statusColor, statusLabel } from "@shared/utils/order.utils";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

type StaffOverviewPayload = {
  staff: StaffModel | null;
  processes: OrderItemProcessModel[];
  timeline: OrderItemProcessInProgressProcessModel[];
  overview: StaffOverviewModel | null;
};

type ProcessStatusKey = "waiting" | "in_progress" | "qc" | "rework" | "completed";

type ProcessLoadGroup = {
  key: string;
  processName: string;
  sectionName: string;
  openOrders: number;
  waiting: number;
  inProgress: number;
  qc: number;
  rework: number;
};

type SectionLoadGroup = {
  sectionName: string;
  openOrders: number;
  activeProcesses: number;
  waiting: number;
  rework: number;
  qc: number;
};

const STATUS_SEQUENCE = ["waiting", "in_progress", "qc", "rework"] as const satisfies ProcessStatusKey[];
const numberFormatter = new Intl.NumberFormat("vi-VN");
const currencyFormatter = new Intl.NumberFormat("vi-VN");

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function formatCurrency(value?: number | null) {
  return `${prefixCurrency} ${currencyFormatter.format(Number(value ?? 0))}`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function resolveProcessStatus(item?: OrderItemProcessModel | null): ProcessStatusKey {
  const explicitStatus = typeof item?.customFields?.status === "string"
    ? String(item.customFields.status).toLowerCase()
    : "";

  if (explicitStatus === "completed") return "completed";
  if (explicitStatus === "qc") return "qc";
  if (explicitStatus === "rework") return "rework";
  if (explicitStatus === "in_progress") return "in_progress";
  if (item?.completedAt) return "completed";
  if (item?.startedAt) return "in_progress";
  return "waiting";
}

function countDurationSeconds(startedAt?: string | null, completedAt?: string | null) {
  if (!startedAt) return 0;

  const startMs = new Date(startedAt).getTime();
  const endMs = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;

  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

function buildThroughputData(
  items: OrderItemProcessInProgressProcessModel[],
  rangeStart: dayjs.Dayjs,
  rangeEnd: dayjs.Dayjs,
) {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item.completedAt) continue;
    const key = dayjs(item.completedAt).format("YYYY-MM-DD");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const results: Array<{ date: string; total: number }> = [];
  const totalDays = Math.max(1, rangeEnd.startOf("day").diff(rangeStart.startOf("day"), "day") + 1);

  for (let i = 0; i < totalDays; i += 1) {
    const day = rangeStart.add(i, "day");
    const key = day.format("YYYY-MM-DD");
    results.push({
      date: key,
      total: counts.get(key) ?? 0,
    });
  }

  return results;
}

function loadingSkeletonCards() {
  return (
    <ResponsiveGrid xs={1} sm={2} md={3} lg={3} xl={6}>
      {Array.from({ length: 6 }, (_, index) => (
        <SectionCard key={index} dense noDivider sx={{ height: "100%" }}>
          <Stack spacing={1.25}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="70%" height={32} />
            <Skeleton variant="text" width="55%" />
          </Stack>
        </SectionCard>
      ))}
    </ResponsiveGrid>
  );
}

function WorkloadStatusSection({
  total,
  statusCounts,
}: {
  total: number;
  statusCounts: Record<ProcessStatusKey, number>;
}) {
  return (
    <SectionCard title="Trạng thái workload hiện tại">
      {total <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nhân sự này hiện chưa có công đoạn mở để theo dõi.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {STATUS_SEQUENCE.map((status) => {
            const count = statusCounts[status] ?? 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            const color = statusColor(status);

            return (
              <Box key={status}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {statusLabel(status) || status}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatNumber(count)} công đoạn
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

function InsightFlagRow({
  title,
  value,
  caption,
  tone = "default",
}: {
  title: string;
  value: string;
  caption: React.ReactNode;
  tone?: ChipProps["color"];
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        px: 1.5,
        py: 1.25,
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
        <Stack spacing={0.35}>
          <Typography variant="body2" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        </Stack>
        <Chip size="small" color={tone} label={value} />
      </Stack>
    </Box>
  );
}

function ProcessLoadRow({
  item,
  maxOpenOrders,
}: {
  item: ProcessLoadGroup;
  maxOpenOrders: number;
}) {
  const loadPercent = maxOpenOrders > 0 ? (item.openOrders / maxOpenOrders) * 100 : 0;

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
              {item.processName || "Công đoạn"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.sectionName || "Chưa gắn phân xưởng"} • {formatNumber(item.openOrders)} đơn đang chạm công đoạn này
            </Typography>
          </Stack>
          <Typography variant="body2" fontWeight={700}>
            Tải hiện tại {Math.round(loadPercent)}%
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={loadPercent}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: alpha("#1976d2", 0.14),
            "& .MuiLinearProgress-bar": {
              bgcolor: "#1976d2",
            },
          }}
        />

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <ProcessMetricChip label="Chờ" value={item.waiting} color={statusColor("waiting")} />
          <ProcessMetricChip label="Gia công" value={item.inProgress} color={statusColor("in_progress")} />
          <ProcessMetricChip label="QC" value={item.qc} color={statusColor("qc")} />
          <ProcessMetricChip label="Làm lại" value={item.rework} color={statusColor("rework")} />
        </Stack>
      </Stack>
    </Box>
  );
}

function ProcessLoadSection({ groups }: { groups: ProcessLoadGroup[] }) {
  const maxOpenOrders = React.useMemo(
    () => groups.reduce((max, item) => Math.max(max, item.openOrders), 0),
    [groups],
  );

  return (
    <SectionCard title="Tải gia công theo công đoạn">
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có cụm công đoạn mở để phân tích tải hiện tại.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {groups.map((item) => (
            <ProcessLoadRow key={item.key} item={item} maxOpenOrders={maxOpenOrders} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function ActiveOrderRow({
  item,
  onOpen,
}: {
  item: OrderItemProcessModel;
  onOpen: (item: OrderItemProcessModel) => void;
}) {
  const status = resolveProcessStatus(item);
  const color = statusColor(status);
  const durationSeconds = item.startedAt ? countDurationSeconds(item.startedAt) : 0;
  const timingLabel = item.startedAt
    ? `Đã chạy ${formatDuration(durationSeconds)}`
    : "Đang chờ nhận công đoạn";

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
              <OrderCodeText code={item.orderCode} fallback={`#${item.orderItemId ?? item.id ?? "N/A"}`} />
            </Typography>
            <Chip
              size="small"
              label={statusLabel(status) || status}
              sx={{
                bgcolor: alpha(color, 0.12),
                color,
                fontWeight: 600,
              }}
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {[item.productCode, item.productName].filter(Boolean).join(" - ") || "Chưa có sản phẩm"}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            {[item.sectionName, item.processName].filter(Boolean).join(" • ") || "Chưa có công đoạn"}
          </Typography>
        </Stack>

        <Stack spacing={0.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
          <Typography variant="body2" fontWeight={700}>
            {timingLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.startedAt ? formatDateTime(item.startedAt) : "Chưa bắt đầu"}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function ActiveOrdersSection({
  items,
}: {
  items: OrderItemProcessModel[];
}) {
  const navigate = useNavigate();

  return (
    <SectionCard title="Đơn đang chạm tay">
      {items.length === 0 ? (
        <EmptyState
          title="Chưa có đơn đang mở"
          description="Hiện không có đơn hàng nào đang gắn với nhân sự này ở các công đoạn mở."
        />
      ) : (
        <Stack spacing={1.25}>
          {items.map((item, index) => (
            <React.Fragment key={`${item.orderItemId ?? item.id ?? index}-${item.processName ?? "process"}-${item.startedAt ?? "na"}`}>
              <ActiveOrderRow
                item={item}
                onOpen={(target) => {
                  if (!target.orderId || !target.orderItemId) return;
                  navigate(`/order/${target.orderId}/historical/${target.orderItemId}`);
                }}
              />
            </React.Fragment>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function SectionDistributionSection({
  groups,
}: {
  groups: SectionLoadGroup[];
}) {
  const maxOpenOrders = React.useMemo(
    () => groups.reduce((max, item) => Math.max(max, item.openOrders), 0),
    [groups],
  );

  return (
    <SectionCard title="Phân bổ workload theo phân xưởng">
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có phân xưởng nào phát sinh tải mở cho nhân sự này.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {groups.map((item) => {
            const percent = maxOpenOrders > 0 ? (item.openOrders / maxOpenOrders) * 100 : 0;
            return (
              <Box
                key={item.sectionName}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Stack spacing={1}>
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                    <Stack spacing={0.35}>
                      <Typography fontWeight={700}>
                        {item.sectionName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatNumber(item.openOrders)} đơn mở • {formatNumber(item.activeProcesses)} công đoạn active
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <ProcessMetricChip label="Chờ" value={item.waiting} color={statusColor("waiting")} />
                      <ProcessMetricChip label="QC" value={item.qc} color={statusColor("qc")} />
                      <ProcessMetricChip label="Làm lại" value={item.rework} color={statusColor("rework")} />
                    </Stack>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      bgcolor: alpha("#455a64", 0.12),
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "#455a64",
                      },
                    }}
                  />
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </SectionCard>
  );
}

function RecentCompletionSection({
  items,
}: {
  items: OrderItemProcessInProgressProcessModel[];
}) {
  const navigate = useNavigate();

  return (
    <SectionCard title="Hoàn tất gần đây">
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          7 ngày gần nhất chưa có công đoạn hoàn tất.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {items.map((item, index) => (
            <Box
              key={`${item.id ?? index}-${item.completedAt ?? "completed"}`}
              onClick={() => {
                if (!item.orderId || !item.orderItemId) return;
                navigate(`/order/${item.orderId}/historical/${item.orderItemId}`);
              }}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
                cursor: item.orderId && item.orderItemId ? "pointer" : "default",
                transition: "border-color 120ms ease, transform 120ms ease",
                "&:hover": item.orderId && item.orderItemId ? {
                  borderColor: "primary.main",
                  transform: "translateY(-1px)",
                } : undefined,
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                <Stack spacing={0.35}>
                  <Typography fontWeight={700}>
                    <OrderCodeText code={item.orderItemCode} fallback={`#${item.orderItemId ?? item.id ?? "N/A"}`} />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[item.sectionName, item.processName].filter(Boolean).join(" • ") || "Chưa có công đoạn"}
                  </Typography>
                </Stack>
                <Stack spacing={0.35} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                  <Chip
                    size="small"
                    label="Hoàn tất"
                    sx={{
                      bgcolor: alpha(statusColor("completed"), 0.12),
                      color: statusColor("completed"),
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {item.completedAt ? formatDateTime(item.completedAt) : "Chưa có thời gian"}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function RevenueWindowSection({
  overview,
}: {
  overview: StaffOverviewModel | null;
}) {
  const windows = overview?.revenueWindows ?? [];
  const summary = overview?.summary;
  const topWindow = React.useMemo(() => {
    return windows.reduce<typeof windows[number] | null>((best, item) => {
      if (!best || item.totalRevenue > best.totalRevenue) return item;
      return best;
    }, null);
  }, [windows]);

  return (
    <SectionCard title="Doanh thu quy đổi theo chu kỳ">
      <Stack spacing={2}>
        <ResponsiveGrid xs={1} sm={2} md={2} lg={4}>
          {windows.map((item) => (
            <StatCard
              key={item.key}
              title={item.label}
              value={formatCurrency(item.totalRevenue)}
              delta={`${formatNumber(item.orderCount)} đơn`}
              tone={item.totalRevenue > 0 ? "success" : "default"}
              caption={item.orderCount > 0
                ? `Bình quân ${formatCurrency(item.totalRevenue / Math.max(item.orderCount, 1))}/đơn`
                : "Chưa có đơn hoàn tất trong kỳ"}
            />
          ))}
        </ResponsiveGrid>

        <ResponsiveGrid xs={1} md={2} lg={3}>
          <InsightFlagRow
            title="Tổng doanh thu đã quy đổi"
            value={formatCurrency(summary?.lifetimeRevenue)}
            caption={`${formatNumber(summary?.lifetimeOrders)} đơn đã có công đoạn hoàn tất bởi nhân sự này.`}
            tone={(summary?.lifetimeRevenue ?? 0) > 0 ? "success" : "default"}
          />
          <InsightFlagRow
            title="Giá trị TB / đơn"
            value={formatCurrency(summary?.averageOrderValue)}
            caption="Tính trên các đơn có công đoạn đã hoàn tất bởi nhân sự này."
            tone={(summary?.averageOrderValue ?? 0) > 0 ? "info" : "default"}
          />
          <InsightFlagRow
            title="Chu kỳ mạnh nhất"
            value={topWindow ? topWindow.label : "Chưa có"}
            caption={topWindow
              ? `${formatCurrency(topWindow.totalRevenue)} • ${formatNumber(topWindow.orderCount)} đơn`
              : "Chưa có doanh thu được ghi nhận."}
            tone={(topWindow?.totalRevenue ?? 0) > 0 ? "success" : "default"}
          />
        </ResponsiveGrid>
      </Stack>
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

function toneByCount(value: number): ChipProps["color"] {
  if (value <= 0) return "default";
  if (value >= 5) return "warning";
  return "info";
}

function toneByDuration(seconds: number): ChipProps["color"] {
  if (seconds <= 0) return "default";
  if (seconds >= 60 * 60 * 12) return "warning";
  return "success";
}

export function StaffOverviewWidget() {
  const { staffId } = useParams();
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  const resolvedStaffId = React.useMemo(() => {
    const parsed = Number(staffId ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [staffId]);

  const rangeEnd = React.useMemo(() => dayjs().endOf("day"), []);
  const rangeStart = React.useMemo(() => rangeEnd.subtract(29, "day").startOf("day"), [rangeEnd]);

  const { data, loading, error, reload } = useAsync<StaffOverviewPayload | null>(
    async () => {
      if (!resolvedStaffId || !canViewOrder) return null;

      const [overview, staff, processes, timeline] = await Promise.all([
        getStaffOverview(resolvedStaffId),
        getStaffById(resolvedStaffId),
        processesForStaff(resolvedStaffId),
        getInProgressesForStaffTimeline(
          resolvedStaffId,
          rangeStart.format("YYYY-MM-DD"),
          rangeEnd.format("YYYY-MM-DD"),
        ),
      ]);

      return {
        overview,
        staff,
        processes,
        timeline,
      };
    },
    [resolvedStaffId, canViewOrder, rangeStart, rangeEnd],
    {
      key: `staff-detail-overview:${resolvedStaffId || "new"}`,
    },
  );

  const errorStatus = React.useMemo(() => {
    if (!error || typeof error !== "object" || !("response" in error)) return undefined;
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }, [error]);

  const isForbidden = errorStatus === 403;
  const overview = data?.overview ?? null;
  const processes = data?.processes ?? [];
  const timeline = data?.timeline ?? [];

  const processStats = React.useMemo(() => {
    const stats: Record<ProcessStatusKey, number> = {
      waiting: 0,
      in_progress: 0,
      qc: 0,
      rework: 0,
      completed: 0,
    };

    for (const item of processes) {
      stats[resolveProcessStatus(item)] += 1;
    }

    return stats;
  }, [processes]);

  const openProcesses = React.useMemo(
    () => processes.filter((item) => resolveProcessStatus(item) !== "completed"),
    [processes],
  );

  const activeProcesses = React.useMemo(
    () => openProcesses.filter((item) => resolveProcessStatus(item) !== "waiting"),
    [openProcesses],
  );

  const activeOrderCount = React.useMemo(() => {
    return new Set(
      openProcesses
        .map((item) => item.orderItemId)
        .filter((value): value is number => typeof value === "number" && value > 0),
    ).size;
  }, [openProcesses]);

  const lifetimeOrderCount = React.useMemo(() => {
    return new Set(
      processes
        .map((item) => item.orderItemId)
        .filter((value): value is number => typeof value === "number" && value > 0),
    ).size;
  }, [processes]);

  const activeSectionCount = React.useMemo(() => {
    return new Set(
      openProcesses
        .map((item) => item.sectionName?.trim())
        .filter((value): value is string => Boolean(value)),
    ).size;
  }, [openProcesses]);

  const activeProcessCount = React.useMemo(() => {
    return new Set(
      openProcesses
        .map((item) => item.processName?.trim())
        .filter((value): value is string => Boolean(value)),
    ).size;
  }, [openProcesses]);

  const completedInRange = React.useMemo(
    () => timeline.filter((item) => Boolean(item.completedAt)),
    [timeline],
  );

  const averageCycleSeconds = React.useMemo(() => {
    const durations = completedInRange
      .map((item) => countDurationSeconds(item.startedAt, item.completedAt))
      .filter((value) => value > 0);

    if (durations.length === 0) return 0;
    return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
  }, [completedInRange]);

  const throughputData = React.useMemo(
    () => buildThroughputData(timeline, rangeStart, rangeEnd),
    [timeline, rangeStart, rangeEnd],
  );

  const todayOutput = React.useMemo(() => {
    const todayKey = dayjs().format("YYYY-MM-DD");
    return throughputData.find((item) => item.date === todayKey)?.total ?? 0;
  }, [throughputData]);

  const busiestDay = React.useMemo(() => {
    return throughputData.reduce<{ date: string; total: number } | null>((best, item) => {
      if (!best || item.total > best.total) return item;
      return best;
    }, null);
  }, [throughputData]);

  const latestCheckpoint = React.useMemo(() => {
    return [...processes]
      .filter((item) => Boolean(item.completedAt || item.startedAt))
      .sort((left, right) => {
        const leftTime = new Date(left.completedAt ?? left.startedAt ?? "").getTime();
        const rightTime = new Date(right.completedAt ?? right.startedAt ?? "").getTime();
        return rightTime - leftTime;
      })[0];
  }, [processes]);

  const longestRunningItem = React.useMemo(() => {
    return [...activeProcesses]
      .filter((item) => Boolean(item.startedAt))
      .sort((left, right) => countDurationSeconds(right.startedAt) - countDurationSeconds(left.startedAt))[0];
  }, [activeProcesses]);

  const processLoadGroups = React.useMemo<ProcessLoadGroup[]>(() => {
    const groups = new Map<string, ProcessLoadGroup & { orderIds: Set<number> }>();

    for (const item of openProcesses) {
      const status = resolveProcessStatus(item);
      const processName = item.processName?.trim() || "Công đoạn";
      const sectionName = item.sectionName?.trim() || "Chưa gắn phân xưởng";
      const key = `${sectionName}::${processName}`;
      const existing = groups.get(key) ?? {
        key,
        processName,
        sectionName,
        openOrders: 0,
        waiting: 0,
        inProgress: 0,
        qc: 0,
        rework: 0,
        orderIds: new Set<number>(),
      };

      if (status === "waiting") existing.waiting += 1;
      if (status === "in_progress") existing.inProgress += 1;
      if (status === "qc") existing.qc += 1;
      if (status === "rework") existing.rework += 1;
      if (typeof item.orderItemId === "number" && item.orderItemId > 0) {
        existing.orderIds.add(item.orderItemId);
      }

      groups.set(key, existing);
    }

    return Array.from(groups.values())
      .map(({ orderIds, ...group }) => ({
        ...group,
        openOrders: orderIds.size,
      }))
      .sort((left, right) => {
        if (right.openOrders !== left.openOrders) return right.openOrders - left.openOrders;
        const rightActive = right.inProgress + right.qc + right.rework;
        const leftActive = left.inProgress + left.qc + left.rework;
        return rightActive - leftActive;
      });
  }, [openProcesses]);

  const sectionLoadGroups = React.useMemo<SectionLoadGroup[]>(() => {
    const groups = new Map<string, SectionLoadGroup & { orderIds: Set<number> }>();

    for (const item of openProcesses) {
      const sectionName = item.sectionName?.trim() || "Chưa gắn phân xưởng";
      const status = resolveProcessStatus(item);
      const existing = groups.get(sectionName) ?? {
        sectionName,
        openOrders: 0,
        activeProcesses: 0,
        waiting: 0,
        rework: 0,
        qc: 0,
        orderIds: new Set<number>(),
      };

      if (status !== "waiting") existing.activeProcesses += 1;
      if (status === "waiting") existing.waiting += 1;
      if (status === "qc") existing.qc += 1;
      if (status === "rework") existing.rework += 1;
      if (typeof item.orderItemId === "number" && item.orderItemId > 0) {
        existing.orderIds.add(item.orderItemId);
      }

      groups.set(sectionName, existing);
    }

    return Array.from(groups.values())
      .map(({ orderIds, ...group }) => ({
        ...group,
        openOrders: orderIds.size,
      }))
      .sort((left, right) => right.openOrders - left.openOrders);
  }, [openProcesses]);

  const highlightedItems = React.useMemo(() => {
    return [...openProcesses]
      .sort((left, right) => {
        const leftStatus = resolveProcessStatus(left);
        const rightStatus = resolveProcessStatus(right);
        const leftStarted = left.startedAt ? new Date(left.startedAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightStarted = right.startedAt ? new Date(right.startedAt).getTime() : Number.MAX_SAFE_INTEGER;

        if (leftStatus === "waiting" && rightStatus !== "waiting") return 1;
        if (leftStatus !== "waiting" && rightStatus === "waiting") return -1;
        return leftStarted - rightStarted;
      })
      .slice(0, 6);
  }, [openProcesses]);

  const recentCompletedItems = React.useMemo(() => {
    const sevenDaysAgo = dayjs().subtract(6, "day").startOf("day");
    return [...completedInRange]
      .filter((item) => item.completedAt && dayjs(item.completedAt).isAfter(sevenDaysAgo))
      .sort((left, right) => {
        const leftTime = new Date(left.completedAt ?? "").getTime();
        const rightTime = new Date(right.completedAt ?? "").getTime();
        return rightTime - leftTime;
      })
      .slice(0, 5);
  }, [completedInRange]);

  const alertStats = React.useMemo(() => {
    const longRunningThreshold = 8 * 60 * 60;
    const oldestSeconds = longestRunningItem?.startedAt ? countDurationSeconds(longestRunningItem.startedAt) : 0;
    const longRunningCount = activeProcesses.filter((item) => countDurationSeconds(item.startedAt) >= longRunningThreshold).length;
    const reworkOrders = new Set(
      openProcesses
        .filter((item) => resolveProcessStatus(item) === "rework")
        .map((item) => item.orderItemId)
        .filter((value): value is number => typeof value === "number" && value > 0),
    ).size;
    const qcOrders = new Set(
      openProcesses
        .filter((item) => resolveProcessStatus(item) === "qc")
        .map((item) => item.orderItemId)
        .filter((value): value is number => typeof value === "number" && value > 0),
    ).size;

    return {
      oldestSeconds,
      longRunningCount,
      reworkOrders,
      qcOrders,
    };
  }, [activeProcesses, longestRunningItem?.startedAt, openProcesses]);

  const topSection = sectionLoadGroups[0];
  const topProcess = processLoadGroups[0];
  const completionRate = processes.length > 0 ? (processStats.completed / processes.length) * 100 : 0;

  const hasInsight = Boolean(processes.length || timeline.length);

  if (!canViewOrder || isForbidden) {
    return (
      <SectionCard title="Tổng quan vận hành">
        <EmptyState
          title="Không có quyền xem dữ liệu vận hành"
          description="Bạn cần quyền xem đơn hàng để theo dõi workload và tiến trình gia công của nhân sự này."
          icon={<LockOutlinedIcon fontSize="inherit" />}
        />
      </SectionCard>
    );
  }

  if (error && !data) {
    return (
      <OverviewErrorState
        message="Không tải được insight vận hành của nhân sự."
        onRetry={() => void reload()}
      />
    );
  }

  if (loading && !data) {
    return loadingSkeletonCards();
  }

  if (!data || !hasInsight) {
    return (
      <SectionCard title="Tổng quan vận hành">
        <EmptyState
          title="Chưa có dữ liệu vận hành"
          description="Nhân sự này chưa phát sinh công đoạn hoặc checkpoint gia công để tổng hợp insight."
        />
      </SectionCard>
    );
  }

  return (
    <Stack spacing={2}>
      <SectionCard
        title={(
          <Stack spacing={0.25}>
            <Typography variant="h6" fontWeight={700}>
              Insight điều hành của {data.staff?.name || "nhân sự"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nhìn nhanh tải đơn, trạng thái công việc, nhịp xử lý và điểm cần chú ý trong 30 ngày gần nhất.
            </Typography>
          </Stack>
        )}
      >
        <Stack spacing={2}>
          {loading ? <LinearProgress /> : null}

          <ResponsiveGrid xs={1} sm={2} md={3} lg={3} xl={6}>
            <StatCard
              title="Đơn đang chạm tay"
              value={formatNumber(activeOrderCount)}
              delta={`${formatNumber(lifetimeOrderCount)} đơn lịch sử`}
              tone={toneByCount(activeOrderCount)}
              caption={`${formatNumber(openProcesses.length)} công đoạn đang mở`}
              icon={<PendingActionsOutlinedIcon fontSize="small" />}
            />
            <StatCard
              title="Đang gia công"
              value={formatNumber(activeProcesses.length)}
              delta={`${formatNumber(processStats.qc + processStats.rework)} cần theo sát`}
              tone={toneByCount(activeProcesses.length)}
              caption={`${formatNumber(processStats.waiting)} công đoạn đang chờ nhận`}
              icon={<PrecisionManufacturingOutlinedIcon fontSize="small" />}
            />
            <StatCard
              title="Phạm vi phụ trách"
              value={`${formatNumber(activeSectionCount)} xưởng`}
              delta={`${formatNumber(activeProcessCount)} công đoạn`}
              tone={toneByCount(activeSectionCount)}
              caption="Theo các đầu việc còn mở"
              icon={<WorkHistoryOutlinedIcon fontSize="small" />}
            />
            <StatCard
              title="Hoàn tất 30 ngày"
              value={formatNumber(completedInRange.length)}
              delta={`${formatNumber(todayOutput)} hôm nay`}
              tone={toneByCount(completedInRange.length)}
              caption={busiestDay?.total ? `Cao điểm ${dayjs(busiestDay.date).format("DD/MM/YYYY")}: ${formatNumber(busiestDay.total)}` : "Chưa có ngày cao điểm"}
              icon={<TaskAltOutlinedIcon fontSize="small" />}
            />
            <StatCard
              title="Chu kỳ TB / công đoạn"
              value={averageCycleSeconds > 0 ? formatDuration(averageCycleSeconds) : "Chưa có"}
              delta={longestRunningItem?.startedAt ? formatDuration(countDurationSeconds(longestRunningItem.startedAt)) : undefined}
              tone={toneByDuration(averageCycleSeconds)}
              caption={longestRunningItem?.processName ? `Đầu việc dài nhất: ${longestRunningItem.processName}` : "Chưa có đầu việc đang chạy"}
              icon={<ScheduleOutlinedIcon fontSize="small" />}
            />
            <StatCard
              title="Checkpoint gần nhất"
              value={latestCheckpoint?.completedAt ? "Hoàn tất" : latestCheckpoint?.startedAt ? "Đã nhận" : "Chưa có"}
              delta={formatTimeAgo((latestCheckpoint?.completedAt ?? latestCheckpoint?.startedAt) || undefined) ?? undefined}
              tone={latestCheckpoint ? "info" : "default"}
              caption={latestCheckpoint
                ? `${latestCheckpoint.processName || "Công đoạn"} • ${formatDateTime(latestCheckpoint.completedAt ?? latestCheckpoint.startedAt)}`
                : "Chưa phát sinh checkpoint"}
              icon={<WorkHistoryOutlinedIcon fontSize="small" />}
            />
          </ResponsiveGrid>
        </Stack>
      </SectionCard>

      <ResponsiveGrid xs={1} md={2} lg={2}>
        <SectionCard
          title={(
            <Stack direction="row" spacing={1} alignItems="center">
              <WarningAmberOutlinedIcon fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Tín hiệu cần chú ý
              </Typography>
            </Stack>
          )}
        >
          <Stack spacing={1}>
            <InsightFlagRow
              title="Đầu việc chạy lâu"
              value={alertStats.longRunningCount > 0 ? `${formatNumber(alertStats.longRunningCount)} công đoạn` : "Ổn định"}
              caption={longestRunningItem?.processName
                ? `Đầu việc lâu nhất: ${longestRunningItem.processName}${longestRunningItem.sectionName ? ` • ${longestRunningItem.sectionName}` : ""}`
                : "Hiện chưa có công đoạn active kéo dài."}
              tone={alertStats.longRunningCount > 0 ? "warning" : "success"}
            />
            <InsightFlagRow
              title="Làm lại / QC cần theo dõi"
              value={`${formatNumber(alertStats.reworkOrders)} remake • ${formatNumber(alertStats.qcOrders)} QC`}
              caption="Đây là nhóm đơn dễ phát sinh chậm tiến độ hoặc cần can thiệp sớm."
              tone={alertStats.reworkOrders > 0 ? "warning" : alertStats.qcOrders > 0 ? "info" : "success"}
            />
            <InsightFlagRow
              title="Tỷ lệ hoàn tất"
              value={formatPercent(completionRate)}
              caption="Tỷ lệ công đoạn đã hoàn tất trên toàn bộ lịch sử công đoạn được gán cho nhân sự này."
              tone={completionRate >= 70 ? "success" : completionRate > 0 ? "info" : "default"}
            />
          </Stack>
        </SectionCard>

        <SectionCard
          title={(
            <Stack direction="row" spacing={1} alignItems="center">
              <BoltOutlinedIcon fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Focus hiện tại
              </Typography>
            </Stack>
          )}
        >
          <Stack spacing={1.25}>
            <InsightFlagRow
              title="Phân xưởng tải cao nhất"
              value={topSection ? `${topSection.sectionName}` : "Chưa có"}
              caption={topSection
                ? `${formatNumber(topSection.openOrders)} đơn mở • ${formatNumber(topSection.activeProcesses)} công đoạn active`
                : "Chưa có dữ liệu tải mở theo phân xưởng."}
              tone={topSection?.rework ? "warning" : topSection?.qc ? "info" : "default"}
            />
            <InsightFlagRow
              title="Công đoạn nóng nhất"
              value={topProcess?.processName || "Chưa có"}
              caption={topProcess
                ? `${topProcess.sectionName} • ${formatNumber(topProcess.openOrders)} đơn đang chạm công đoạn này`
                : "Chưa có công đoạn mở để xác định điểm nóng."}
              tone={topProcess && (topProcess.rework > 0 || topProcess.qc > 0) ? "warning" : "info"}
            />
            <InsightFlagRow
              title="Aging dài nhất"
              value={alertStats.oldestSeconds > 0 ? formatDuration(alertStats.oldestSeconds) : "Chưa có"}
              caption={longestRunningItem?.orderCode
                ? (
                  <>
                    <OrderCodeText code={longestRunningItem.orderCode} />
                    {` • ${longestRunningItem.processName || "Công đoạn"}`}
                  </>
                )
                : "Chưa có đầu việc active để đo aging."}
              tone={alertStats.oldestSeconds >= 8 * 60 * 60 ? "warning" : alertStats.oldestSeconds > 0 ? "success" : "default"}
            />
          </Stack>
        </SectionCard>
      </ResponsiveGrid>

      <RevenueWindowSection overview={overview} />
      <WorkloadStatusSection total={openProcesses.length} statusCounts={processStats} />

      <SectionCard title="Nhịp xử lý 30 ngày">
        <Stack spacing={2}>
          <StaffThroughputChart data={throughputData} />

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <ProcessMetricChip label="Hoàn tất hôm nay" value={todayOutput} color={statusColor("completed")} />
            <ProcessMetricChip label="Đang chờ" value={processStats.waiting} color={statusColor("waiting")} />
            <ProcessMetricChip label="QC" value={processStats.qc} color={statusColor("qc")} />
            <ProcessMetricChip label="Làm lại" value={processStats.rework} color={statusColor("rework")} />
          </Stack>
        </Stack>
      </SectionCard>

      <ProcessLoadSection groups={processLoadGroups} />
      <SectionDistributionSection groups={sectionLoadGroups} />
      <RecentCompletionSection items={recentCompletedItems} />
      <ActiveOrdersSection items={highlightedItems} />
    </Stack>
  );
}

registerSlot({
  id: "staff-detail-overview",
  name: "staff-detail:overview",
  priority: 4,
  render: () => <StaffOverviewWidget />,
});

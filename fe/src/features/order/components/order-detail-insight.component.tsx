import React from "react";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useParams } from "react-router-dom";
import { useAsync } from "@root/core/hooks/use-async";
import { formatDateTime, formatDuration, relTime } from "@root/shared/utils/datetime.utils";
import { ResponsiveGrid } from "@root/shared/components/ui/responsive-grid";
import { SectionCard } from "@shared/components/ui/section-card";
import { StatCard } from "@features/dashboard/components/stat-card";
import {
  deliveryStatusLabel,
  priorityColor,
  priorityLabel,
  statusColor,
  statusLabel,
} from "@root/shared/utils/order.utils";
import { getDeliveryStatusByOrderItemId } from "../api/order.api";
import { getInProgressesByOrderItemId, processes } from "../api/order-item-process.api";
import type { OrderItemProcessInProgressProcessModel } from "../model/order-item-process-inprogress-process.model";
import type { OrderItemProcessModel } from "../model/order-item-process.model";
import type { OrderModel } from "../model/order.model";

type OrderDetailInsightProps = {
  detail?: OrderModel | null;
  loading?: boolean;
};

type InsightMetricTone = "default" | "info" | "success" | "warning" | "error";

function resolveProcessStatus(item?: OrderItemProcessModel | null): string {
  const explicitStatus = typeof item?.customFields?.status === "string"
    ? item.customFields.status
    : null;

  if (explicitStatus) return explicitStatus;
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

function buildProgressValue(status: string) {
  switch (status) {
    case "completed":
      return 100;
    case "qc":
      return 82;
    case "rework":
      return 68;
    case "in_progress":
      return 56;
    case "issue":
      return 42;
    default:
      return 14;
  }
}

function mapToneByPercent(percent: number): InsightMetricTone {
  if (percent >= 100) return "success";
  if (percent >= 65) return "info";
  if (percent > 0) return "warning";
  return "default";
}

function mapToneByDeadline(deadlineColor?: string): InsightMetricTone {
  if (deadlineColor === "#d32f2f") return "error";
  if (deadlineColor === "#2e7d32") return "success";
  return "default";
}

function buildCompactLabel(values: Array<string | null | undefined>, max = 3) {
  const unique = Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  if (unique.length === 0) return "";
  if (unique.length <= max) return unique.join(", ");
  return `${unique.slice(0, max).join(", ")} +${unique.length - max}`;
}

function formatCheckpointLabel(item?: {
  startedAt?: string | null;
  completedAt?: string | null;
}) {
  if (item?.completedAt) {
    return `Hoàn thành ${formatDateTime(item.completedAt)}`;
  }

  if (item?.startedAt) {
    return `Bắt đầu ${formatDateTime(item.startedAt)}`;
  }

  return "Chưa khởi động";
}

function buildMetricChipTone(value: number): InsightMetricTone {
  if (value <= 0) return "default";
  if (value >= 3) return "warning";
  return "info";
}

function buildInsightTitle(detail?: OrderModel | null) {
  const latestCode = detail?.codeLatest?.trim();
  const originalCode = detail?.code?.trim();
  const displayCode = latestCode || originalCode;

  if (!displayCode) return "Insight điều hành";
  if (originalCode && latestCode && originalCode !== latestCode) {
    return `Insight điều hành - Mã: ${latestCode} - Mã gốc: ${originalCode}`;
  }
  return `Insight điều hành - Mã: ${displayCode}`;
}

function MetricChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Chip
      size="small"
      label={`${label}: ${value}`}
      sx={{
        bgcolor: alpha(color, 0.12),
        color,
        fontWeight: 600,
        "& .MuiChip-label": {
          px: 1.25,
        },
      }}
    />
  );
}

function SummaryRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
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
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={0.75}
        justifyContent="space-between"
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={700}>
          {value}
        </Typography>
      </Stack>
      {helper ? (
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      ) : null}
    </Box>
  );
}

function ProcessStatusChip({ status }: { status: string }) {
  const color = statusColor(status);

  return (
    <Chip
      size="small"
      label={statusLabel(status) || status}
      sx={{
        bgcolor: alpha(color, 0.12),
        color,
        fontWeight: 600,
      }}
    />
  );
}

function ProcessTimelineRow({
  item,
  index,
}: {
  item: OrderItemProcessModel;
  index: number;
}) {
  const status = resolveProcessStatus(item);
  const durationLabel = item.startedAt
    ? formatDuration(countDurationSeconds(item.startedAt, item.completedAt))
    : "";
  const secondaryLine = buildCompactLabel([item.sectionName, item.assignedName], 2);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        borderLeft: `4px solid ${statusColor(status)}`,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: statusColor(status),
                flexShrink: 0,
              }}
            />
            <Typography fontWeight={700}>
              Bước {item.stepNumber ?? index + 1}: {item.processName?.trim() || "Công đoạn"}
            </Typography>
          </Stack>

          {secondaryLine ? (
            <Typography variant="body2" color="text.secondary">
              {secondaryLine}
            </Typography>
          ) : null}

          <Typography variant="caption" color="text.secondary">
            {formatCheckpointLabel(item)}
          </Typography>
        </Stack>

        <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={0.75}>
          <ProcessStatusChip status={status} />
          {durationLabel ? (
            <Typography variant="caption" color="text.secondary">
              Thời lượng: {durationLabel}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={buildProgressValue(status)}
        sx={{
          mt: 1.25,
          height: 6,
          borderRadius: 999,
          bgcolor: alpha(statusColor(status), 0.12),
          "& .MuiLinearProgress-bar": {
            bgcolor: statusColor(status),
          },
        }}
      />
    </Box>
  );
}

export function OrderDetailInsight({ detail, loading }: OrderDetailInsightProps) {
  const { orderId, orderItemId } = useParams();
  const resolvedOrderId = React.useMemo(() => {
    if (typeof detail?.id === "number") return detail.id;

    if (!orderId) return null;
    const parsed = Number(orderId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [detail?.id, orderId]);

  const resolvedOrderItemId = React.useMemo(() => {
    if (orderItemId) {
      const parsed = Number(orderItemId);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const latestOrderItemId = detail?.latestOrderItem?.id;
    return typeof latestOrderItemId === "number" ? latestOrderItemId : null;
  }, [detail?.latestOrderItem?.id, orderItemId]);

  const { data: processList, loading: loadingProcesses } =
    useAsync<OrderItemProcessModel[]>(
      () => {
        if (!resolvedOrderId || !resolvedOrderItemId) return Promise.resolve([]);
        return processes(resolvedOrderId, resolvedOrderItemId);
      },
      [resolvedOrderId, resolvedOrderItemId],
      {
        key: `order-detail-insight:processes:${resolvedOrderId ?? ""}:${resolvedOrderItemId ?? ""}`,
      }
    );

  const { data: inProgressList, loading: loadingInProgresses } =
    useAsync<OrderItemProcessInProgressProcessModel[]>(
      () => {
        if (!resolvedOrderId || !resolvedOrderItemId) return Promise.resolve([]);
        return getInProgressesByOrderItemId(resolvedOrderId, resolvedOrderItemId);
      },
      [resolvedOrderId, resolvedOrderItemId],
      {
        key: `order-detail-insight:inprogress:${resolvedOrderId ?? ""}:${resolvedOrderItemId ?? ""}`,
      }
    );

  const { data: deliveryStatus } = useAsync<string | null>(
    () => {
      if (!resolvedOrderId || !resolvedOrderItemId) return Promise.resolve(null);
      return getDeliveryStatusByOrderItemId(resolvedOrderId, resolvedOrderItemId);
    },
    [resolvedOrderId, resolvedOrderItemId],
    {
      key: `order-detail-insight:delivery:${resolvedOrderId ?? ""}:${resolvedOrderItemId ?? ""}`,
    }
  );

  const orderedProcesses = React.useMemo(() => {
    return [...(processList ?? [])].sort((left, right) => {
      const leftStep = left.stepNumber ?? Number.MAX_SAFE_INTEGER;
      const rightStep = right.stepNumber ?? Number.MAX_SAFE_INTEGER;
      if (leftStep !== rightStep) return leftStep - rightStep;
      return (left.processName ?? "").localeCompare(right.processName ?? "");
    });
  }, [processList]);

  const processStats = React.useMemo(() => {
    const stats = {
      total: orderedProcesses.length,
      completed: 0,
      waiting: 0,
      inProgress: 0,
      qc: 0,
      rework: 0,
    };

    for (const item of orderedProcesses) {
      const status = resolveProcessStatus(item);
      if (status === "completed") stats.completed += 1;
      else if (status === "qc") stats.qc += 1;
      else if (status === "rework") stats.rework += 1;
      else if (status === "in_progress") stats.inProgress += 1;
      else stats.waiting += 1;
    }

    return stats;
  }, [orderedProcesses]);

  const completionPercent = React.useMemo(() => {
    if (processStats.total <= 0) {
      return detail?.statusLatest === "completed" ? 100 : 0;
    }

    return Math.round((processStats.completed / processStats.total) * 100);
  }, [detail?.statusLatest, processStats.completed, processStats.total]);

  const activeInProgresses = React.useMemo(
    () =>
      [...(inProgressList ?? [])]
        .filter((item) => Boolean(item.startedAt) && !item.completedAt)
        .sort((left, right) => {
          const leftStart = new Date(left.startedAt ?? "").getTime();
          const rightStart = new Date(right.startedAt ?? "").getTime();
          return rightStart - leftStart;
        }),
    [inProgressList]
  );

  const lastCompletedInProgress = React.useMemo(
    () =>
      [...(inProgressList ?? [])]
        .filter((item) => Boolean(item.completedAt))
        .sort((left, right) => {
          const leftCompleted = new Date(left.completedAt ?? "").getTime();
          const rightCompleted = new Date(right.completedAt ?? "").getTime();
          return rightCompleted - leftCompleted;
        })[0],
    [inProgressList]
  );

  const nextPendingProcess = React.useMemo(
    () => orderedProcesses.find((item) => resolveProcessStatus(item) === "waiting"),
    [orderedProcesses]
  );

  const uniqueStaffCount = React.useMemo(() => {
    return new Set(
      [
        ...orderedProcesses.map((item) => item.assignedName),
        ...(inProgressList ?? []).map((item) => item.assignedName),
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    ).size;
  }, [inProgressList, orderedProcesses]);

  const uniqueSectionCount = React.useMemo(() => {
    return new Set(
      [
        ...orderedProcesses.map((item) => item.sectionName),
        ...(inProgressList ?? []).map((item) => item.sectionName),
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    ).size;
  }, [inProgressList, orderedProcesses]);

  const productCount = React.useMemo(() => {
    const productIds = new Set<number>();
    const latestProducts = detail?.latestOrderItem?.products ?? [];

    for (const item of latestProducts) {
      if (typeof item?.productId === "number") {
        productIds.add(item.productId);
      }
    }

    for (const item of orderedProcesses) {
      if (typeof item.productId === "number") {
        productIds.add(item.productId);
      }
    }

    for (const item of inProgressList ?? []) {
      if (typeof item.productId === "number") {
        productIds.add(item.productId);
      }
    }

    if (productIds.size > 0) return productIds.size;
    return detail?.productId ? 1 : 0;
  }, [detail?.latestOrderItem?.products, detail?.productId, inProgressList, orderedProcesses]);

  const remakeCount = detail?.latestOrderItem?.remakeCount ?? detail?.remakeCount ?? 0;
  const currentFocus = detail?.processNameLatest
    || activeInProgresses[0]?.processName
    || nextPendingProcess?.processName
    || (completionPercent >= 100 ? "Hoàn tất toàn bộ công đoạn" : "Chưa có công đoạn");
  const currentFocusHelper = activeInProgresses.length > 0
    ? [
      buildCompactLabel(activeInProgresses.map((item) => item.sectionName), 2),
      buildCompactLabel(activeInProgresses.map((item) => item.assignedName), 2),
      activeInProgresses[0]?.startedAt
        ? `Đã chạy ${formatDuration(countDurationSeconds(activeInProgresses[0].startedAt))}`
        : "",
    ].filter(Boolean).join(" • ")
    : "Chưa có công đoạn đang chạy.";

  const latestCheckpointValue = lastCompletedInProgress?.processName
    ? `${lastCompletedInProgress.processName}`
    : detail?.createdAt
      ? "Tạo đơn"
      : "Chưa có mốc xử lý";
  const latestCheckpointHelper = lastCompletedInProgress?.completedAt
    ? formatDateTime(lastCompletedInProgress.completedAt)
    : detail?.createdAt
      ? formatDateTime(detail.createdAt)
      : "";

  const deadlineIndicator = detail?.deliveryDate
    ? relTime(detail.deliveryDate, new Date())
    : null;
  const displayStatus = detail?.statusLatest
    ? statusLabel(detail.statusLatest)
    : "Chưa xác định";
  const displayPriority = detail?.priorityLatest
    ? priorityLabel(detail.priorityLatest)
    : "Bình thường";
  const displayDeliveryStatus = deliveryStatus
    ? deliveryStatusLabel(deliveryStatus)
    : "Chưa có trạng thái giao";
  const insightLoading = Boolean(loading && !detail);
  const syncing = Boolean(loadingProcesses || loadingInProgresses);
  const insightTitle = React.useMemo(() => buildInsightTitle(detail), [detail]);

  return (
    <Stack spacing={2}>
      <SectionCard
        title={
          <Stack spacing={0.25}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <InsightsOutlinedIcon fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                {insightTitle}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Trạng thái, tín hiệu vận hành và tiến độ gia công của đơn hàng đang xem.
            </Typography>
          </Stack>
        }
      >
        {insightLoading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <Stack spacing={2}>
            {syncing ? <LinearProgress /> : null}

            <ResponsiveGrid xs={1} sm={2} md={2} lg={4} xl={4}>
              <StatCard
                title="Trạng thái đơn"
                value={displayStatus}
                delta={displayPriority}
                tone={mapToneByPercent(completionPercent)}
                caption={deliveryStatus ? `Giao/Nhận: ${displayDeliveryStatus}` : "Đang theo dõi tiến độ tổng thể"}
                icon={<PendingActionsOutlinedIcon fontSize="small" />}
              />

              <StatCard
                title="Tiến độ công đoạn"
                value={processStats.total > 0 ? `${processStats.completed}/${processStats.total}` : "Chưa có"}
                delta={`${completionPercent}%`}
                tone={mapToneByPercent(completionPercent)}
                caption={
                  processStats.total > 0
                    ? `${processStats.inProgress + processStats.qc + processStats.rework} công đoạn đang mở`
                    : "Chưa có sơ đồ công đoạn"
                }
                icon={<PrecisionManufacturingOutlinedIcon fontSize="small" />}
              />

              <StatCard
                title="Điểm xử lý hiện tại"
                value={currentFocus}
                delta={activeInProgresses.length > 0 ? `${activeInProgresses.length} đang chạy` : undefined}
                tone={activeInProgresses.length > 0 ? "info" : "default"}
                caption={currentFocusHelper}
                icon={<GroupOutlinedIcon fontSize="small" />}
              />

              <StatCard
                title="Hạn giao"
                value={detail?.deliveryDate ? formatDateTime(detail.deliveryDate) : "Chưa có"}
                delta={deadlineIndicator?.text}
                tone={mapToneByDeadline(deadlineIndicator?.color)}
                caption={deliveryStatus ? `Trạng thái giao: ${displayDeliveryStatus}` : "Theo dõi theo ngày giao dự kiến"}
                icon={<LocalShippingOutlinedIcon fontSize="small" />}
              />
            </ResponsiveGrid>

            <Divider />

            <Stack spacing={1.25}>
              <Typography variant="subtitle2" fontWeight={700}>
                Tín hiệu vận hành
              </Typography>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <MetricChip
                  label="Đang chạy"
                  value={processStats.inProgress + processStats.qc + processStats.rework}
                  color={statusColor("in_progress")}
                />
                <MetricChip
                  label="Đang chờ"
                  value={processStats.waiting}
                  color={statusColor("received")}
                />
                <MetricChip
                  label="QC"
                  value={processStats.qc}
                  color={statusColor("qc")}
                />
                <MetricChip
                  label="Làm lại"
                  value={processStats.rework}
                  color={statusColor("rework")}
                />
                <MetricChip
                  label="Nhân sự"
                  value={uniqueStaffCount}
                  color="#1976d2"
                />
                <MetricChip
                  label="Phân xưởng"
                  value={uniqueSectionCount}
                  color="#5d4037"
                />
                <MetricChip
                  label="Sản phẩm"
                  value={productCount}
                  color="#6a1b9a"
                />
                <MetricChip
                  label="Remake"
                  value={remakeCount}
                  color={remakeCount > 0 ? priorityColor("urgent") : "#9e9e9e"}
                />
              </Stack>

              <SummaryRow
                label="Luồng xử lý hiện tại"
                value={currentFocus}
                helper={currentFocusHelper}
              />

              <SummaryRow
                label="Bước kế tiếp"
                value={nextPendingProcess?.processName?.trim() || "Chưa có bước chờ"}
                helper={
                  nextPendingProcess
                    ? buildCompactLabel(
                      [
                        nextPendingProcess.sectionName,
                        nextPendingProcess.assignedName
                          ? `Dự kiến phụ trách: ${nextPendingProcess.assignedName}`
                          : "Chưa phân công",
                      ],
                      2
                    )
                    : completionPercent >= 100
                      ? "Đơn đã đi hết chuỗi công đoạn."
                      : "Không tìm thấy bước chờ tiếp theo."
                }
              />

              <SummaryRow
                label="Mốc cập nhật gần nhất"
                value={latestCheckpointValue}
                helper={latestCheckpointHelper}
              />
            </Stack>
          </Stack>
        )}
      </SectionCard>

      <SectionCard
        title="Tiến trình gia công trực quan"
        extra={
          <Chip
            size="small"
            label={processStats.total > 0 ? `${processStats.completed}/${processStats.total} hoàn thành` : "Chưa có dữ liệu"}
            color={buildMetricChipTone(processStats.completed) === "warning" ? "warning" : "default"}
            variant="outlined"
          />
        }
      >
        {orderedProcesses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Chưa có dữ liệu công đoạn để phân tích tiến trình.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            <Box>
              <LinearProgress
                variant="determinate"
                value={completionPercent}
                sx={{ height: 8, borderRadius: 999 }}
              />
              <Typography variant="caption" color="text.secondary">
                Hoàn thành {completionPercent}% chuỗi gia công. {processStats.waiting > 0
                  ? `Còn ${processStats.waiting} bước đang chờ.`
                  : "Không còn bước chờ."}
              </Typography>
            </Box>

            {orderedProcesses.map((item, index) => (
              <ProcessTimelineRow key={item.id ?? `${item.processName ?? "process"}-${index}`} item={item} index={index} />
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}

import * as React from "react";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
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
import { useAsync } from "@root/core/hooks/use-async";
import { catalogOverview as getCatalogOverview } from "@features/process/api/process.api";
import type {
  ProcessCatalogOverviewModel,
  ProcessCatalogOverviewOrderStatusBreakdownModel,
  ProcessCatalogOverviewProcessLoadModel,
} from "@features/process/model/process-catalog-overview.model";
import { StatCard } from "@features/dashboard/components/stat-card";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { SectionCard } from "@shared/components/ui/section-card";
import { statusColor, statusLabel } from "@shared/utils/order.utils";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const ORDER_STATUS_SEQUENCE = ["received", "in_progress", "qc", "rework"] as const;

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function buildNarrative(data: ProcessCatalogOverviewModel) {
  const busiestProcess = data.processLoads[0]?.processName ?? "chưa xác định";

  return `${formatNumber(data.coverage.processesWithOrders)} trên ${formatNumber(data.coverage.totalProcesses)} công đoạn đã phát sinh trên đơn hàng. Hiện có ${formatNumber(data.summary.openOrders)} đơn mở với ${formatNumber(data.summary.openProcesses)} checkpoint chưa hoàn tất, tải xử lý dồn nhiều nhất ở ${busiestProcess}.`;
}

function LoadingState() {
  return (
    <Stack spacing={2}>
      <SectionCard title="Tổng quan công đoạn theo order">
        <Stack spacing={1.25}>
          <Skeleton variant="text" width="34%" />
          <Skeleton variant="text" width="82%" />
        </Stack>
      </SectionCard>

      <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
        {Array.from({ length: 5 }, (_, index) => (
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

function OrderStatusPanel({
  summary,
  statusBreakdown,
}: {
  summary: ProcessCatalogOverviewModel["summary"];
  statusBreakdown: ProcessCatalogOverviewOrderStatusBreakdownModel[];
}) {
  const statusMap = React.useMemo(() => {
    return statusBreakdown.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});
  }, [statusBreakdown]);

  return (
    <SectionCard title="Trạng thái đơn theo công đoạn" sx={{ height: "100%" }}>
      {summary.openOrders <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có đơn đang mở để hiển thị phân bổ trạng thái.
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

function ProcessLoadPanel({ processLoads }: { processLoads: ProcessCatalogOverviewProcessLoadModel[] }) {
  const maxOpenProcesses = Math.max(1, ...processLoads.map((item) => item.openProcesses));

  return (
    <SectionCard title="Tải theo công đoạn" sx={{ height: "100%" }}>
      {processLoads.length <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu workload để xếp hạng công đoạn.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {processLoads.map((item) => {
            const percent = (item.openProcesses / maxOpenProcesses) * 100;
            return (
              <Box
                key={item.processId}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.25,
                }}
              >
                <Stack spacing={0.9}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        {item.processName || `Công đoạn #${item.processId}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.sectionName || item.processCode || "Chưa gán phòng ban"}
                      </Typography>
                    </Box>
                    <Chip size="small" label={`${formatNumber(item.activeOrders)} đơn`} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatNumber(item.openProcesses)} checkpoint mở, {formatNumber(item.inProductionOrders)} đơn đang gia công
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      bgcolor: alpha("#1976d2", 0.14),
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "#1976d2",
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Tiến độ xử lý {formatNumber(item.completionPercent)}%
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </SectionCard>
  );
}

export function ProcessInsightWidget() {
  const { data, error, loading, reload } = useAsync<ProcessCatalogOverviewModel | null>(
    () => getCatalogOverview(),
    [],
    { key: "process-catalog-overview" }
  );

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return (
      <SectionCard
        title="Tổng quan công đoạn theo order"
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          Không tải được insight công đoạn. Có thể thử tải lại để đồng bộ dữ liệu mới nhất.
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
              Tổng quan công đoạn theo order
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Góc nhìn tổng hợp để đọc nhanh độ phủ công đoạn trong dòng chảy đơn hàng và các điểm đang dồn tải.
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
          {buildNarrative(data)}
        </Typography>
      </SectionCard>

      <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
        <StatCard
          title="Công đoạn có việc"
          value={formatNumber(data.coverage.processesWithOrders)}
          caption={`${formatNumber(data.coverage.totalProcesses)} công đoạn toàn hệ thống`}
          icon={<FactCheckOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Đơn đang mở"
          value={formatNumber(data.summary.openOrders)}
          caption={`${formatNumber(data.summary.completedOrders)} đơn đã hoàn thành`}
          icon={<AssignmentOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Đơn đang gia công"
          value={formatNumber(data.summary.inProductionOrders)}
          caption={`${formatNumber(data.summary.openProcesses)} checkpoint mở`}
          icon={<PrecisionManufacturingRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tiến độ toàn hệ"
          value={`${formatNumber(data.summary.completionPercent)}%`}
          caption={`${formatNumber(data.summary.remakeOrders)} đơn làm lại`}
          icon={<TimelineRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tổng đơn lịch sử"
          value={formatNumber(data.summary.lifetimeOrders)}
          caption="Theo các công đoạn đã phát sinh trên đơn"
          icon={<TimelineRoundedIcon fontSize="small" />}
        />
      </ResponsiveGrid>

      <ResponsiveGrid xs={1} md={2} lg={2} xl={2}>
        <OrderStatusPanel
          summary={data.summary}
          statusBreakdown={data.orderStatusBreakdown}
        />
        <ProcessLoadPanel processLoads={data.processLoads} />
      </ResponsiveGrid>
    </Stack>
  );
}

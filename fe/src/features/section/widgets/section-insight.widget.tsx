import * as React from "react";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
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
import { navigate } from "@root/core/navigation/navigate";
import { catalogOverview as getCatalogOverview } from "@features/section/api/section.api";
import type {
  SectionCatalogOverviewModel,
  SectionCatalogOverviewOrderStatusBreakdownModel,
  SectionCatalogOverviewSectionLoadModel,
} from "@features/section/model/section-catalog-overview.model";
import { StatCard } from "@features/dashboard/components/stat-card";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { SectionCard } from "@shared/components/ui/section-card";
import { statusColor, statusLabel } from "@shared/utils/order.utils";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const ORDER_STATUS_SEQUENCE = ["received", "in_progress", "qc", "rework"] as const;

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function buildNarrative(data: SectionCatalogOverviewModel) {
  const summary = data.summary;
  const coverage = data.coverage;
  const busiestSection = data.sectionLoads[0]?.sectionName ?? "chưa xác định";

  return `${formatNumber(coverage.sectionsWithOrders)} trên ${formatNumber(coverage.totalSections)} phòng ban đã phát sinh đơn hàng. Hiện có ${formatNumber(summary.openOrders)} đơn mở với ${formatNumber(summary.openProcesses)} công đoạn chưa hoàn tất, tải vận hành tập trung nhiều nhất ở ${busiestSection}.`;
}

function LoadingState() {
  return (
    <Stack spacing={2}>
      <SectionCard title="Tổng quan vận hành phòng ban">
        <Stack spacing={1.25}>
          <Skeleton variant="text" width="36%" />
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

function StatusBreakdownPanel({
  summary,
  statusBreakdown,
}: {
  summary: SectionCatalogOverviewModel["summary"];
  statusBreakdown: SectionCatalogOverviewOrderStatusBreakdownModel[];
}) {
  const statusMap = React.useMemo(() => {
    return statusBreakdown.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});
  }, [statusBreakdown]);

  return (
    <SectionCard title="Trạng thái đơn theo phòng ban" sx={{ height: "100%" }}>
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

function SectionLoadPanel({ sectionLoads }: { sectionLoads: SectionCatalogOverviewSectionLoadModel[] }) {
  const maxOpenProcesses = Math.max(1, ...sectionLoads.map((item) => item.openProcesses));

  return (
    <SectionCard title="Tải theo phòng ban" sx={{ height: "100%" }}>
      {sectionLoads.length <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu workload để xếp hạng phòng ban.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {sectionLoads.map((item) => {
            const percent = (item.openProcesses / maxOpenProcesses) * 100;
            return (
              <Box
                key={item.sectionId}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/section/${item.sectionId}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/section/${item.sectionId}`);
                  }
                }}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.25,
                  cursor: "pointer",
                  transition: "border-color 120ms ease, background-color 120ms ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: alpha("#1976d2", 0.03),
                  },
                }}
              >
                <Stack spacing={0.9}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        {item.sectionName || `Phòng ban #${item.sectionId}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.leaderName || "Chưa có trưởng phòng"}
                      </Typography>
                    </Box>
                    <Chip size="small" label={`${formatNumber(item.activeOrders)} đơn`} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatNumber(item.openProcesses)} công đoạn mở, {formatNumber(item.inProductionOrders)} đơn đang gia công
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

export function SectionInsightWidget() {
  const { data, error, loading, reload } = useAsync<SectionCatalogOverviewModel | null>(
    () => getCatalogOverview(),
    [],
    { key: "section-catalog-overview" }
  );

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return (
      <SectionCard
        title="Tổng quan vận hành phòng ban"
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          Không tải được insight phòng ban. Có thể thử tải lại để đồng bộ dữ liệu mới nhất.
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
              Tổng quan vận hành phòng ban
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Góc nhìn tổng hợp để đọc nhanh độ phủ phòng ban trong dòng chảy đơn hàng và tải xử lý hiện tại.
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
          title="Phòng ban có việc"
          value={formatNumber(data.coverage.sectionsWithOrders)}
          caption={`${formatNumber(data.coverage.totalSections)} phòng ban toàn hệ thống`}
          icon={<ApartmentRoundedIcon fontSize="small" />}
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
          caption={`${formatNumber(data.summary.openProcesses)} công đoạn mở`}
          icon={<PrecisionManufacturingRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tiến độ toàn hệ"
          value={`${formatNumber(data.summary.completionPercent)}%`}
          caption={`${formatNumber(data.summary.remakeOrders)} đơn làm lại`}
          icon={<HistoryRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tổng đơn lịch sử"
          value={formatNumber(data.summary.lifetimeOrders)}
          caption="Theo toàn bộ phòng ban đã phát sinh"
          icon={<TimelineRoundedIcon fontSize="small" />}
        />
      </ResponsiveGrid>

      <ResponsiveGrid xs={1} md={2} lg={2} xl={2}>
        <StatusBreakdownPanel
          summary={data.summary}
          statusBreakdown={data.orderStatusBreakdown}
        />
        <SectionLoadPanel sectionLoads={data.sectionLoads} />
      </ResponsiveGrid>
    </Stack>
  );
}

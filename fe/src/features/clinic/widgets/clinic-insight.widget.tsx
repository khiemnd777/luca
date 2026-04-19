import * as React from "react";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LocalHospitalOutlinedIcon from "@mui/icons-material/LocalHospitalOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
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
import { catalogOverview as getCatalogOverview } from "@features/clinic/api/clinic.api";
import type {
  ClinicCatalogOverviewClinicLoadModel,
  ClinicCatalogOverviewModel,
  ClinicCatalogOverviewOrderStatusBreakdownModel,
} from "@features/clinic/model/clinic-catalog-overview.model";
import { StatCard } from "@features/dashboard/components/stat-card";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { SectionCard } from "@shared/components/ui/section-card";
import { EmptyState } from "@shared/components/ui/empty-state";
import { statusColor, statusLabel } from "@shared/utils/order.utils";
import { useAuthStore } from "@store/auth-store";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const ORDER_STATUS_SEQUENCE = ["received", "in_progress", "qc", "rework", "completed"] as const;

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function LoadingState() {
  return (
    <Stack spacing={2}>
      <SectionCard title="Tổng quan vận hành nha khoa">
        <Stack spacing={1.25}>
          <Skeleton variant="text" width="34%" />
          <Skeleton variant="text" width="80%" />
        </Stack>
      </SectionCard>
      <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
        {Array.from({ length: 5 }, (_, index) => (
          <SectionCard key={index} dense noDivider sx={{ height: "100%" }}>
            <Stack spacing={1.25}>
              <Skeleton variant="text" width="42%" />
              <Skeleton variant="text" width="70%" height={32} />
              <Skeleton variant="text" width="54%" />
            </Stack>
          </SectionCard>
        ))}
      </ResponsiveGrid>
    </Stack>
  );
}

function buildNarrative(data: ClinicCatalogOverviewModel) {
  const busiestClinic = data.clinicLoads[0]?.clinicName ?? "chưa xác định";
  return `${formatNumber(data.coverage.clinicsWithOrders)} trên ${formatNumber(data.coverage.totalClinics)} nha khoa đã phát sinh đơn hàng. Hiện có ${formatNumber(data.summary.openOrders)} đơn mở và ${formatNumber(data.summary.inProductionOrders)} đơn đang gia công; nhu cầu vận hành tập trung nhiều nhất ở ${busiestClinic}.`;
}

function StatusBreakdownPanel({
  summary,
  statusBreakdown,
}: {
  summary: ClinicCatalogOverviewModel["summary"];
  statusBreakdown: ClinicCatalogOverviewOrderStatusBreakdownModel[];
}) {
  const statusMap = React.useMemo(() => {
    return statusBreakdown.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});
  }, [statusBreakdown]);

  return (
    <SectionCard title="Trạng thái đơn theo nha khoa" sx={{ height: "100%" }}>
      {summary.openOrders <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có đơn hàng đang mở để hiển thị phân bổ trạng thái.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {ORDER_STATUS_SEQUENCE.map((status) => {
            const count = statusMap[status] ?? 0;
            const percent = summary.lifetimeOrders > 0 ? (count / summary.lifetimeOrders) * 100 : 0;
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
                    "& .MuiLinearProgress-bar": { bgcolor: color },
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

function ClinicLoadPanel({ clinicLoads }: { clinicLoads: ClinicCatalogOverviewClinicLoadModel[] }) {
  const maxOpenOrders = Math.max(1, ...clinicLoads.map((item) => item.openOrders));

  return (
    <SectionCard title="Nha khoa cần theo dõi" sx={{ height: "100%" }}>
      {clinicLoads.length <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu để xếp hạng nha khoa theo tải đơn.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {clinicLoads.map((item) => (
            <Box
              key={item.clinicId}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/clinic/${item.clinicId}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/clinic/${item.clinicId}`);
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
                      {item.clinicName || `Nha khoa #${item.clinicId}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatNumber(item.lifetimeOrders)} đơn lịch sử
                    </Typography>
                  </Box>
                  <Chip size="small" label={`${formatNumber(item.openOrders)} đơn mở`} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {formatNumber(item.inProductionOrders)} đơn đang gia công, {formatNumber(item.completedOrders)} đơn đã hoàn thành
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(item.openOrders / maxOpenOrders) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: alpha("#1976d2", 0.14),
                    "& .MuiLinearProgress-bar": { bgcolor: "#1976d2" },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Tiến độ xử lý {formatNumber(item.completionPercent)}%
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

export function ClinicInsightWidget() {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));
  const { data, error, loading, reload } = useAsync<ClinicCatalogOverviewModel | null>(
    () => {
      if (!canViewOrder) return Promise.resolve(null);
      return getCatalogOverview();
    },
    [canViewOrder],
    { key: "clinic-catalog-overview" }
  );

  if (!canViewOrder) {
    return (
      <SectionCard title="Tổng quan vận hành nha khoa">
        <EmptyState
          title="Không có quyền xem dữ liệu vận hành"
          description="Bạn cần quyền xem đơn hàng để phân tích tương quan giữa nha khoa và đơn hàng."
          icon={<LockOutlinedIcon fontSize="inherit" />}
        />
      </SectionCard>
    );
  }

  if (loading && !data) return <LoadingState />;

  if (error && !data) {
    return (
      <SectionCard
        title="Tổng quan vận hành nha khoa"
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          Không tải được insight nha khoa. Có thể thử tải lại để đồng bộ dữ liệu mới nhất.
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
              Tổng quan vận hành nha khoa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Góc nhìn tổng hợp để đọc nhanh độ phủ nha khoa trong đơn hàng và nhận diện các đối tác đang tạo tải nhiều nhất.
            </Typography>
          </Stack>
        )}
        extra={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={data.coverage.scopeLabel || "Toàn bộ nha khoa"} sx={{ fontWeight: 600 }} />
            <Chip
              size="small"
              color="info"
              label={`${formatNumber(data.coverage.clinicsWithOrders)}/${formatNumber(data.coverage.totalClinics)} nha khoa có đơn`}
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

      <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
        <StatCard
          title="Nha khoa có đơn"
          value={formatNumber(data.coverage.clinicsWithOrders)}
          caption={`${formatNumber(data.coverage.totalClinics)} nha khoa toàn hệ thống`}
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
          caption={`${formatNumber(data.summary.remakeOrders)} đơn làm lại`}
          icon={<TimelineRoundedIcon fontSize="small" />}
        />
        <StatCard
          title="Tiến độ toàn hệ"
          value={`${formatNumber(data.summary.completionPercent)}%`}
          caption="Theo checkpoint của các đơn gắn nha khoa"
          icon={<LocalHospitalOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Tổng đơn lịch sử"
          value={formatNumber(data.summary.lifetimeOrders)}
          caption="Theo tất cả nha khoa đã phát sinh đơn"
          icon={<HistoryRoundedIcon fontSize="small" />}
        />
      </ResponsiveGrid>

      <ResponsiveGrid xs={1} md={2} lg={2} xl={2}>
        <StatusBreakdownPanel summary={data.summary} statusBreakdown={data.orderStatusBreakdown} />
        <ClinicLoadPanel clinicLoads={data.clinicLoads} />
      </ResponsiveGrid>
    </Stack>
  );
}

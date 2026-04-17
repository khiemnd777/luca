import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
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
import { useAsync } from "@core/hooks/use-async/use-async";
import { registerSlot } from "@root/core/module/registry";
import { getStaffOverview } from "@features/order/api/order.api";
import { processesForStaff } from "@features/order/api/order-item-process.api";
import { StatCard } from "@features/dashboard/components/stat-card";
import { table as fetchStaffTable } from "@features/staff/api/staff.api";
import { SectionCard } from "@shared/components/ui/section-card";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { prefixCurrency } from "@shared/utils/currency.utils";
import { statusColor, statusLabel } from "@shared/utils/order.utils";
import { useAuthStore } from "@store/auth-store";
import type { StaffModel } from "@features/staff/model/staff.model";
import {
  buildStaffInsightSummary,
  type StaffInsightCoverage,
  type StaffInsightOrderSnapshot,
  type StaffInsightStatusKey,
  type StaffInsightSummary,
} from "@features/staff/utils/staff-insight.utils";

const STAFF_PAGE_LIMIT = 200;
const ORDER_FETCH_BATCH = 6;
const numberFormatter = new Intl.NumberFormat("vi-VN");
const currencyFormatter = new Intl.NumberFormat("vi-VN");
const STATUS_SEQUENCE: StaffInsightStatusKey[] = ["waiting", "in_progress", "qc", "rework"];

type StaffInsightPayload = {
  canViewOrder: boolean;
  summary: StaffInsightSummary;
};

function formatNumber(value?: number | null) {
  return numberFormatter.format(Number(value ?? 0));
}

function formatCurrency(value?: number | null) {
  return `${prefixCurrency} ${currencyFormatter.format(Number(value ?? 0))}`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function buildCoverageTone(coverage: StaffInsightCoverage) {
  if (coverage.failedStaffs <= 0) return "success";
  if (coverage.staffsWithOrderData > 0) return "warning";
  return "default";
}

function buildNarrative(summary: StaffInsightSummary, canViewOrder: boolean) {
  const busiestSection = summary.sectionLoads[0]?.sectionName ?? summary.workforceSections[0]?.sectionName ?? "chưa xác định";
  const topPerformer = summary.topPerformers[0]?.name ?? "chưa có dữ liệu";

  if (!canViewOrder) {
    return `${formatNumber(summary.totalStaff)} nhân sự đang được quản lý, ${formatNumber(summary.activeStaff)} đang kích hoạt và phân bổ trên ${formatNumber(summary.workforceSections.length)} bộ phận. Cần quyền đơn hàng để hiển thị workload gia công và tiến trình vận hành.`;
  }

  return `${formatNumber(summary.assignedStaffCount)} trên ${formatNumber(summary.activeStaff)} nhân sự đang trực tiếp xử lý ${formatNumber(summary.totalOpenProcesses)} công đoạn mở. Trong 30 ngày gần nhất, đội ngũ hoàn tất ${formatNumber(summary.totalRecentCompletedProcesses)} công đoạn, đóng góp ${formatNumber(summary.totalRecentOrders)} đơn và ${formatCurrency(summary.totalRecentRevenue)}. Tải hiện tập trung nhiều nhất ở ${busiestSection}, nhân sự dẫn đầu là ${topPerformer}.`;
}

async function fetchAllStaffs() {
  const staffs: StaffModel[] = [];
  let total = Number.POSITIVE_INFINITY;
  let page = 0;

  while (staffs.length < total) {
    const result = await fetchStaffTable({
      limit: STAFF_PAGE_LIMIT,
      page,
      orderBy: "id",
      direction: "asc",
    });

    staffs.push(...result.items);
    total = result.total ?? staffs.length;
    page += 1;

    if (result.items.length === 0) {
      break;
    }
  }

  return staffs;
}

async function mapOrderSnapshots(staffs: StaffModel[]) {
  const snapshots: StaffInsightOrderSnapshot[] = [];

  for (let index = 0; index < staffs.length; index += ORDER_FETCH_BATCH) {
    const batch = staffs.slice(index, index + ORDER_FETCH_BATCH);
    const settled = await Promise.all(batch.map(async (staff) => {
      const [overviewResult, processesResult] = await Promise.allSettled([
        getStaffOverview(staff.id),
        processesForStaff(staff.id),
      ]);

      return {
        staffId: staff.id,
        overview: overviewResult.status === "fulfilled" ? overviewResult.value : null,
        processes: processesResult.status === "fulfilled" ? processesResult.value : [],
        failed: overviewResult.status === "rejected" || processesResult.status === "rejected",
      } satisfies StaffInsightOrderSnapshot;
    }));

    snapshots.push(...settled);
  }

  return snapshots;
}

function LoadingState() {
  return (
    <Stack spacing={2}>
      <SectionCard title="Insight vận hành nhân sự">
        <Stack spacing={1.5}>
          <Skeleton variant="text" width="72%" height={28} />
          <Skeleton variant="text" width="94%" />
          <Skeleton variant="rounded" height={6} />
        </Stack>
      </SectionCard>

      <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
        {Array.from({ length: 5 }, (_, index) => (
          <SectionCard key={index} dense noDivider sx={{ height: "100%" }}>
            <Stack spacing={1.25}>
              <Skeleton variant="text" width="42%" />
              <Skeleton variant="text" width="64%" height={32} />
              <Skeleton variant="text" width="55%" />
            </Stack>
          </SectionCard>
        ))}
      </ResponsiveGrid>
    </Stack>
  );
}

function WorkloadStatusPanel({
  summary,
  canViewOrder,
}: {
  summary: StaffInsightSummary;
  canViewOrder: boolean;
}) {
  const total = STATUS_SEQUENCE.reduce((acc, status) => acc + summary.backlogStatusCounts[status], 0);

  return (
    <SectionCard title="Tiến trình gia công hiện tại" sx={{ height: "100%" }}>
      {!canViewOrder ? (
        <Typography variant="body2" color="text.secondary">
          Dữ liệu tiến trình chỉ hiển thị khi tài khoản có quyền xem đơn hàng.
        </Typography>
      ) : total <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Hiện chưa có công đoạn mở nào được phân cho nhân sự để theo dõi.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {STATUS_SEQUENCE.map((status) => {
            const count = summary.backlogStatusCounts[status];
            const percent = total > 0 ? (count / total) * 100 : 0;
            const color = statusColor(status);

            return (
              <Box key={status}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {statusLabel(status)}
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

function SectionLoadPanel({
  summary,
  canViewOrder,
}: {
  summary: StaffInsightSummary;
  canViewOrder: boolean;
}) {
  const source = canViewOrder && summary.sectionLoads.length > 0
    ? summary.sectionLoads
    : summary.workforceSections;
  const maxOpenProcesses = Math.max(1, ...source.map((item) => item.openProcesses));
  const title = canViewOrder ? "Phân bổ theo bộ phận" : "Phân bổ headcount theo bộ phận";

  return (
    <SectionCard title={title} sx={{ height: "100%" }}>
      {source.length <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có bộ phận nào để thống kê.
        </Typography>
      ) : (
        <Stack spacing={1.35}>
          {source.slice(0, 5).map((item) => {
            const percent = canViewOrder
              ? (item.openProcesses / maxOpenProcesses) * 100
              : (item.staffCount / Math.max(1, source[0]?.staffCount ?? 1)) * 100;

            return (
              <Box key={item.sectionName}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {item.sectionName}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip size="small" label={`${formatNumber(item.staffCount)} nhân sự`} />
                    {canViewOrder ? (
                      <Chip size="small" color="info" label={`${formatNumber(item.openProcesses)} công đoạn`} />
                    ) : null}
                  </Stack>
                </Stack>
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
              </Box>
            );
          })}
        </Stack>
      )}
    </SectionCard>
  );
}

function TopPerformersPanel({
  summary,
  canViewOrder,
}: {
  summary: StaffInsightSummary;
  canViewOrder: boolean;
}) {
  return (
    <SectionCard title="Nhân sự dẫn đầu" sx={{ height: "100%" }}>
      {!canViewOrder ? (
        <Typography variant="body2" color="text.secondary">
          Chưa đủ quyền để xếp hạng năng suất theo đơn hàng và công đoạn.
        </Typography>
      ) : summary.topPerformers.length <= 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu năng suất gần đây để xếp hạng.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {summary.topPerformers.map((item, index) => (
            <Box
              key={item.staffId}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                px: 1.5,
                py: 1.2,
              }}
            >
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Stack spacing={0.35}>
                  <Typography variant="body2" fontWeight={700}>
                    {index + 1}. {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatNumber(item.recentCompletedProcesses)} công đoạn hoàn tất trong 30 ngày
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                  <Chip size="small" color="info" label={`${formatNumber(item.recentOrders)} đơn`} />
                  <Chip size="small" label={`${formatNumber(item.openProcesses)} đang mở`} />
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function StaffInsightWidget() {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  const { data, error, loading, reload } = useAsync<StaffInsightPayload>(async () => {
    const staffs = await fetchAllStaffs();
    const snapshots = canViewOrder ? await mapOrderSnapshots(staffs) : [];
    const summary = buildStaffInsightSummary(staffs, snapshots);
    return { canViewOrder, summary };
  }, [canViewOrder], {
    key: `staff-insight:${canViewOrder ? "order-view" : "basic"}`,
  });

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return (
      <SectionCard
        title="Insight vận hành nhân sự"
        extra={(
          <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
            Tải lại
          </Button>
        )}
      >
        <Typography variant="body2" color="text.secondary">
          Không tải được số liệu insight cho trang nhân sự. Có thể thử tải lại để đồng bộ dữ liệu mới nhất.
        </Typography>
      </SectionCard>
    );
  }

  const payload = data;
  if (!payload) return null;

  const summary = payload.summary;
  const coverageLabel = payload.canViewOrder
    ? `${formatNumber(summary.coverage.staffsWithOrderData)}/${formatNumber(summary.coverage.expectedStaffs)} nhân sự có dữ liệu đơn hàng`
    : `${formatNumber(summary.workforceSections.length)} bộ phận đang có nhân sự`;

  return (
    <Stack spacing={2}>
      <SectionCard
        title={
          <Stack spacing={0.25}>
            <Typography variant="h6" fontWeight={700}>
              Tổng quan vận hành nhân sự
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Góc nhìn tổng hợp để đọc nhanh tình trạng gia công và năng suất của nhân sự.
            </Typography>
          </Stack>
        }
        extra={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              color={buildCoverageTone(summary.coverage)}
              label={coverageLabel}
            />
            <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void reload()}>
              Làm mới
            </Button>
          </Stack>
        )}
      >
        {loading ? <LinearProgress sx={{ mb: 2 }} /> : null}
        <Typography variant="body2" color="text.secondary">
          {buildNarrative(summary, payload.canViewOrder)}
        </Typography>
      </SectionCard>

      <ResponsiveGrid xs={1} sm={2} md={3} lg={5} xl={5}>
        <StatCard
          title="Tổng nhân sự"
          value={formatNumber(summary.totalStaff)}
          caption="headcount đang được quản lý"
          delta={`${formatNumber(summary.inactiveStaff)} chưa kích hoạt`}
          tone="default"
          icon={<BadgeOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Đang kích hoạt"
          value={formatNumber(summary.activeStaff)}
          caption="sẵn sàng tham gia vận hành"
          delta={formatPercent(summary.totalStaff > 0 ? (summary.activeStaff / summary.totalStaff) * 100 : 0)}
          tone="success"
          icon={<CheckCircleOutlineOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Nhân sự có đơn hàng"
          value={payload.canViewOrder ? formatNumber(summary.assignedStaffCount) : "-"}
          caption={payload.canViewOrder ? `${formatNumber(summary.idleStaffCount)} đang nhàn tải` : "cần quyền order.view"}
          delta={payload.canViewOrder ? formatPercent(summary.engagementRate) : undefined}
          tone="info"
          icon={<AssignmentIndOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Công đoạn đang mở"
          value={payload.canViewOrder ? formatNumber(summary.totalOpenProcesses) : "-"}
          caption={payload.canViewOrder ? `${summary.avgOpenProcessesPerAssigned.toFixed(1)} công đoạn / người có tải` : "workload gia công chưa khả dụng"}
          delta={payload.canViewOrder ? (summary.sectionLoads[0]?.sectionName ?? "Chưa có bộ phận tải cao") : undefined}
          tone="warning"
          icon={<PrecisionManufacturingOutlinedIcon fontSize="small" />}
        />
        <StatCard
          title="Tổng năng suất 30 ngày"
          value={payload.canViewOrder ? formatNumber(summary.totalRecentCompletedProcesses) : "-"}
          caption={payload.canViewOrder ? `${formatNumber(summary.totalRecentOrders)} đơn, ${formatCurrency(summary.totalRecentRevenue)} đóng góp` : "cần quyền order.view"}
          delta={payload.canViewOrder ? "công đoạn hoàn tất" : undefined}
          tone="success"
          icon={<BoltOutlinedIcon fontSize="small" />}
        />
      </ResponsiveGrid>

      <ResponsiveGrid xs={1} sm={1} md={1} lg={3} xl={3}>
        <WorkloadStatusPanel summary={summary} canViewOrder={payload.canViewOrder} />
        <SectionLoadPanel summary={summary} canViewOrder={payload.canViewOrder} />
        <TopPerformersPanel summary={summary} canViewOrder={payload.canViewOrder} />
      </ResponsiveGrid>

      {payload.canViewOrder && summary.coverage.failedStaffs > 0 ? (
        <SectionCard>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
            <Stack spacing={0.35}>
              <Typography variant="body2" fontWeight={700}>
                Một phần dữ liệu workload chưa đồng bộ đầy đủ
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Đã bỏ qua {formatNumber(summary.coverage.failedStaffs)} nhân sự khi tổng hợp dữ liệu đơn hàng để tránh làm gián đoạn trang `/staff`.
              </Typography>
            </Stack>
            <Chip
              size="small"
              color="warning"
              icon={<TrendingUpOutlinedIcon />}
              label="Insight đang ở chế độ partial"
            />
          </Stack>
        </SectionCard>
      ) : null}
    </Stack>
  );
}

registerSlot({
  id: "staff-insight-header",
  name: "staff:header",
  priority: 1,
  render: () => <StaffInsightWidget />,
});

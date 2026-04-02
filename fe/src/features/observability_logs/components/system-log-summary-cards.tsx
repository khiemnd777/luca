import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { StatCard } from "@features/dashboard/components/stat-card";
import type { SystemLogsSummaryModel } from "@features/observability_logs/model/system-log.model";

type SystemLogSummaryCardsProps = {
  summary: SystemLogsSummaryModel;
};

export function SystemLogSummaryCards({ summary }: SystemLogSummaryCardsProps) {
  return (
    <ResponsiveGrid xs={1} sm={2} md={2} lg={2} xl={2}>
      <StatCard
        title="Warn Logs"
        value={summary.warnCount}
        caption="Theo bộ lọc hiện tại"
        tone="warning"
        icon={<WarningAmberRoundedIcon />}
      />
      <StatCard
        title="Error Logs"
        value={summary.errorCount}
        caption="Theo bộ lọc hiện tại"
        tone="error"
        icon={<ErrorOutlineRoundedIcon />}
      />
    </ResponsiveGrid>
  );
}

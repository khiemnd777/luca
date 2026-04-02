import { LinearProgress, Stack, Typography, type LinearProgressProps } from "@mui/material";
import { statusColor, statusDisplayOrder, statusHelper, statusLabel } from "@root/shared/utils/order.utils";
import { SectionCard } from "@shared/components/ui/section-card";

export type CaseStatusItem = {
  status: string;
  label: string;
  count: number;
  target?: number;
  color?: LinearProgressProps["color"];
  helper?: string;
};

type CaseStatusCardProps = {
  title?: string;
  items: CaseStatusItem[];
};

export function CaseStatusCard({ title = "Trạng thái trong ngày", items }: CaseStatusCardProps) {
  return (
    <SectionCard title={title}>
      <Stack spacing={1.5}>
        {items.sort((a, b) => statusDisplayOrder(a.status) - statusDisplayOrder(b.status)).map((item) => {
          const progress = item.target ? Math.min(100, Math.round((item.count / item.target) * 100)) : undefined;
          return (
            <Stack key={item.label} spacing={0.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" fontWeight={600}>{statusLabel(item.status)}</Typography>
                <Typography variant="body2" color="text.secondary">{item.count}</Typography>
              </Stack>
              {typeof progress === "number" ? (
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  color={item.color ?? "primary"}
                  sx={{ "& .MuiLinearProgress-bar": { backgroundColor: statusColor(item.status) } }}
                />
              ) : null}
              {item.helper ? (
                <Typography variant="caption" color="text.secondary">{statusHelper(item.status)}</Typography>
              ) : null}
            </Stack>
          );
        })}
      </Stack>
    </SectionCard>
  );
}

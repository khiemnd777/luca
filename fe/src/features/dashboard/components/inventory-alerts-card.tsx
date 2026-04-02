import { LinearProgress, Stack, Typography, type LinearProgressProps } from "@mui/material";
import { SectionCard } from "@shared/components/ui/section-card";

export type InventoryAlertItem = {
  name: string;
  remaining: number;
  threshold: number;
  unit?: string;
  color?: LinearProgressProps["color"];
};

type InventoryAlertsCardProps = {
  title?: string;
  items: InventoryAlertItem[];
};

export function InventoryAlertsCard({ title = "Inventory Alerts", items }: InventoryAlertsCardProps) {
  return (
    <SectionCard title={title}>
      <Stack spacing={1.5}>
        {items.map((item) => {
          const progress = Math.max(5, Math.round((item.remaining / item.threshold) * 100));
          return (
            <Stack key={item.name} spacing={0.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.remaining}{item.unit ? ` ${item.unit}` : ""}
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={Math.min(100, progress)} color={item.color ?? "warning"} />
              <Typography variant="caption" color="text.secondary">
                Threshold {item.threshold}{item.unit ? ` ${item.unit}` : ""}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </SectionCard>
  );
}

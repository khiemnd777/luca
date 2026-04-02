import { Chip, Divider, Stack, Typography } from "@mui/material";
import { SectionCard } from "@shared/components/ui/section-card";

export type ProductionQueueItem = {
  id: string;
  patient: string;
  caseType: string;
  stage: string;
  due: string;
  technician?: string;
};

type ProductionQueueCardProps = {
  title?: string;
  items: ProductionQueueItem[];
};

export function ProductionQueueCard({ title = "Production Queue", items }: ProductionQueueCardProps) {
  return (
    <SectionCard title={title}>
      <Stack spacing={1.5} divider={<Divider flexItem />}>
        {items.map((item) => (
          <Stack key={item.id} spacing={0.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2" fontWeight={700}>{item.caseType}</Typography>
              <Chip size="small" label={item.stage} color="info" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {item.patient} • {item.id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Due {item.due}{item.technician ? ` • ${item.technician}` : ""}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  );
}

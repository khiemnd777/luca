import { Chip, Divider, Stack, Typography } from "@mui/material";
import { SectionCard } from "@shared/components/ui/section-card";
import { dueTodayStatusChip, priorityColor, priorityLabel, statusColor, statusLabel } from "@root/shared/utils/order.utils";
import { formatDateTime12, formatTime12 } from "@root/shared/utils/datetime.utils";
import { navigate } from "@root/core/navigation/navigate";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { DueTodayItem } from "../model/dashboard.model";

type DueTodayCardProps = {
  title?: string;
  items: DueTodayItem[];
};

export function DueTodayCard({ title = "Giao hôm nay", items }: DueTodayCardProps) {
  return (
    <SectionCard title={title}>
      <Stack spacing={1.5} divider={<Divider flexItem />}>
        {items.map((item) => {
          const priority = (item.priority ?? "normal").toLowerCase();
          const priorityLabelText = priorityLabel(priority);
          const priorityColorValue = priorityColor(priority);
          const deliveryDate = item.deliveryAt != null && item.deliveryAt !== ""
            ? new Date(item.deliveryAt)
            : null;
          const deliveryDateMs = deliveryDate != null ? deliveryDate.getTime() : null;
          const isValidDeliveryDate = deliveryDateMs != null && !Number.isNaN(deliveryDateMs);
          const isOverdue = item.dueType === "overdue";
          const deliveryLabel = isValidDeliveryDate && deliveryDate
            ? (!isOverdue ? formatTime12(deliveryDate) : formatDateTime12(deliveryDate))
            : "––";
          const deliveryStatusChip = dueTodayStatusChip(item.deliveryStatus);

          return (
            <Stack
              key={item.id}
              spacing={0.5}
              onClick={() => navigate(`/order/${item.id}`)}
              role="button"
              sx={{ cursor: "pointer" }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2" fontWeight={700}>
                  {item.code}
                </Typography>
                <Chip
                  size="small"
                  label={priorityLabelText}
                  sx={{
                    bgcolor: priorityColorValue,
                    color: "#fff",
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {item.dentist} {item.patient ? "•" : ""} {item.patient}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Dự kiến giao lúc {deliveryLabel}
                </Typography>

                {isOverdue && (
                  <WarningAmberIcon fontSize="inherit" sx={{ color: "error.main" }} />
                )}

                {item.status === "completed" ? (
                  deliveryStatusChip.label ? (
                    <Chip
                      size="small"
                      label={deliveryStatusChip.label}
                      sx={{ bgcolor: deliveryStatusChip.color, color: "#fff" }}
                    />
                  ) : null
                ) : (
                  <Chip
                    size="small"
                    label={ statusLabel(item.status) }
                    sx={{ bgcolor: statusColor(item.status), color: "#fff" }}
                  />
                )}
              </Stack>

            </Stack>
          );
        })}
      </Stack>
    </SectionCard>
  );
}

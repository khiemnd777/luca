import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import type { OrderItemProcessInProgressProcessModel } from "@features/order/model/order-item-process-inprogress-process.model";
import { normalizeTimelineInput } from "@features/order/components/staff-timeline.utils";
import { StaffTimelineLane } from "@features/order/components/staff-timeline-lane.component";
import { formatDateShort } from "@shared/utils/datetime.utils";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

export type StaffTimelineProps = {
  items: OrderItemProcessInProgressProcessModel[];
  rangeStart: Date;
  rangeEnd: Date;
  onBlockClick?: (item: OrderItemProcessInProgressProcessModel) => void;
};

export function StaffTimeline({ items, rangeStart, rangeEnd, onBlockClick }: StaffTimelineProps) {
  const navigate = useNavigate();
  const lanes = normalizeTimelineInput(items);
  const startDay = dayjs(rangeStart).startOf("day");
  const endDay = dayjs(rangeEnd).startOf("day");
  const dayCount = Math.max(1, endDay.diff(startDay, "day") + 1);
  const isSingleDay = dayCount === 1;

  const axisLabels = React.useMemo(() => {
    if (isSingleDay) {
      const totalHours = Math.max(1, dayjs(rangeEnd).diff(dayjs(rangeStart), "hour", true));
      const hourStep = Math.max(1, Math.ceil(totalHours / 6));
      const labels: string[] = [];
      for (let h = 0; h <= 24; h += hourStep) {
        labels.push(`${Math.min(h, 24)}`);
      }
      return labels;
    }

    const maxTicks = 8;
    const dayStep = Math.max(1, Math.ceil(dayCount / maxTicks));
    const labels: string[] = [];
    for (let i = 0; i < dayCount; i += dayStep) {
      const tickDate = startDay.add(i, "day").toDate();
      labels.push(formatDateShort(tickDate));
    }
    return labels;
  }, [dayCount, isSingleDay, rangeEnd, rangeStart, startDay]);

  const handleLabelClick = React.useCallback((orderId?: number | null) => {
    if (!orderId) return;
    navigate(`/order/${orderId}`);
  }, [navigate]);

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ minWidth: 140 }} />
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" justifyContent="space-between">
            {axisLabels.map((label) => (
              <Typography key={label} variant="caption" color="text.secondary">
                {label}
              </Typography>
            ))}
          </Stack>
        </Box>
      </Stack>

      {lanes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No work recorded in this range.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {lanes.map((lane) => (
            <StaffTimelineLane
              key={lane.processName}
              label={<OrderCodeText code={lane.items[0]?.orderItemCode} fallback="N/A" />}
              items={lane.items}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              gridCount={isSingleDay ? 24 : dayCount}
              gridType={isSingleDay ? "hour" : "day"}
              onLabelClick={() => handleLabelClick(lane.items[0]?.orderId)}
              onBlockClick={onBlockClick}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

import React from "react";
import { Box, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { SectionCard } from "@shared/components/ui/section-card";
import { registerSlot } from "@root/core/module/registry";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useAsync } from "@root/core/hooks/use-async";
import type { OrderItemProcessInProgressProcessModel } from "@features/order/model/order-item-process-inprogress-process.model";
import { getInProgressesForStaffTimeline } from "@features/order/api/order-item-process.api";
import { id as getStaffById } from "@features/staff/api/staff.api";
import { StaffTimeline } from "@features/order/components/staff-timeline.component";
import { StaffThroughputChart, type ThroughputItem } from "@features/order/components/staff-throughput-chart.component";

type RangeKey = "today" | "7d" | "30d";

function buildDateRange(rangeKey: RangeKey) {
  const now = dayjs();
  switch (rangeKey) {
    case "7d":
      return {
        start: now.subtract(6, "day").startOf("day"),
        end: now.endOf("day"),
      };
    case "30d":
      return {
        start: now.subtract(29, "day").startOf("day"),
        end: now.endOf("day"),
      };
    default:
      return {
        start: now.startOf("day"),
        end: now.endOf("day"),
      };
  }
}

function buildThroughputData(
  items: OrderItemProcessInProgressProcessModel[],
  rangeStart: dayjs.Dayjs,
  rangeEnd: dayjs.Dayjs,
): ThroughputItem[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item.completedAt) continue;
    const key = dayjs(item.completedAt).format("YYYY-MM-DD");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const results: ThroughputItem[] = [];
  const totalDays = Math.max(1, rangeEnd.startOf("day").diff(rangeStart.startOf("day"), "day") + 1);

  for (let i = 0; i < totalDays; i += 1) {
    const day = rangeStart.add(i, "day");
    const key = day.format("YYYY-MM-DD");
    results.push({
      date: key,
      total: counts.get(key) ?? 0,
    });
  }

  return results;
}

export function StaffDetailWidget() {
  const { staffId } = useParams();
  const [rangeKey, setRangeKey] = React.useState<RangeKey>("today");
  const range = React.useMemo(() => buildDateRange(rangeKey), [rangeKey]);
  const fromDate = range.start.format("YYYY-MM-DD");
  const toDate = range.end.format("YYYY-MM-DD");

  const { data: staff } = useAsync(() => {
    if (!staffId) return Promise.resolve(null);
    return getStaffById(Number(staffId));
  }, [staffId]);

  const { data: timelineItems, loading } = useAsync<OrderItemProcessInProgressProcessModel[]>(() => {
    if (!staffId) return Promise.resolve([]);
    return getInProgressesForStaffTimeline(Number(staffId), fromDate, toDate);
  }, [staffId, fromDate, toDate]);

  const items = React.useMemo<OrderItemProcessInProgressProcessModel[]>(
    () => timelineItems ?? [],
    [timelineItems],
  );

  const throughputData = React.useMemo(
    () => buildThroughputData(items, range.start, range.end),
    [items, range.start, range.end],
  );

  const handleBlockClick = React.useCallback((item: OrderItemProcessInProgressProcessModel) => {
    void item; // placeholder for future drawer interaction
  }, []);

  return (
    <Stack spacing={2}>
      <SectionCard
        title={
          <Stack spacing={0.25}>
            <Typography variant="h6" fontWeight={700}>
              {staff?.name ?? "Staff detail"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Work timeline
            </Typography>
          </Stack>
        }
        extra={
          <ToggleButtonGroup
            value={rangeKey}
            exclusive
            size="small"
            onChange={(_, value) => value && setRangeKey(value)}
          >
            <ToggleButton value="today">Hôm nay</ToggleButton>
            <ToggleButton value="7d">7 ngày</ToggleButton>
            <ToggleButton value="30d">30 ngày</ToggleButton>
          </ToggleButtonGroup>
        }
      >
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <StaffTimeline
            items={items}
            rangeStart={range.start.toDate()}
            rangeEnd={range.end.toDate()}
            onBlockClick={handleBlockClick}
          />
        )}
      </SectionCard>

      <SectionCard title="Process distribution">
        <StaffThroughputChart data={throughputData} />
      </SectionCard>

    </Stack>
  );
}

registerSlot({
  id: "staff-detail-timeline",
  name: "staff-detail:inprogress",
  priority: 3,
  render: () => <StaffDetailWidget />,
});

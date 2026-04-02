import type { OrderItemProcessInProgressProcessModel } from "@features/order/model/order-item-process-inprogress-process.model";

export type TimelineLane = {
  processName: string;
  items: OrderItemProcessInProgressProcessModel[];
};

export function durationSec(startedAt?: string | null, completedAt?: string | null): number {
  if (!startedAt || !completedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

export function secondsOfDay(date: Date): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export function normalizeTimelineInput(items: OrderItemProcessInProgressProcessModel[]): TimelineLane[] {
  const valid = items.filter((item) => item.startedAt && item.completedAt);
  const sorted = [...valid].sort((a, b) => {
    const aStart = new Date(a.startedAt as string).getTime();
    const bStart = new Date(b.startedAt as string).getTime();
    return aStart - bStart;
  });

  const lanes = new Map<string, OrderItemProcessInProgressProcessModel[]>();

  for (const item of sorted) {
    const key = item.processName?.trim() || "Process";
    const group = lanes.get(key) ?? [];
    group.push(item);
    lanes.set(key, group);
  }

  return Array.from(lanes.entries()).map(([processName, laneItems]) => ({
    processName,
    items: laneItems,
  }));
}

import { Chip } from "@mui/material";
import { createElement, useEffect, useReducer } from "react";
import type { OrderModel } from "@features/order/model/order.model";
import { formatPlanningMinutes, planningRiskColor, planningRiskLabel } from "@root/shared/utils/order.utils";

type ComputedRisk = {
  bucket: string;
  remainingMinutes: number | null;
};

export function OrderRiskChip({ row }: { row: OrderModel | null }) {
  const [, tick] = useReducer((value) => value + 1, 0);

  useEffect(() => {
    const timer = window.setInterval(() => tick(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!row) return "—";

  const computed = computeRisk(row);
  const label = `${planningRiskLabel(computed.bucket)} · ${formatPlanningMinutes(computed.remainingMinutes)}`;

  return createElement(Chip, {
    size: "small",
    label,
    sx: {
      bgcolor: planningRiskColor(computed.bucket),
      color: "#fff",
      fontWeight: 600,
    },
  });
}

function computeRisk(row: OrderModel): ComputedRisk {
  const delivery = row.deliveryAt ?? row.deliveryDate;
  const deliveryMs = delivery ? new Date(delivery).getTime() : Number.NaN;
  if (!Number.isFinite(deliveryMs)) {
    return { bucket: row.riskBucket ?? "normal", remainingMinutes: row.remainingMinutes ?? null };
  }

  const remainingMinutes = Math.floor((deliveryMs - Date.now()) / 60000);
  if (remainingMinutes < 0) return { bucket: "overdue", remainingMinutes };
  if (remainingMinutes <= 120) return { bucket: "due_2h", remainingMinutes };
  if (remainingMinutes <= 240) return { bucket: "due_4h", remainingMinutes };
  if (remainingMinutes <= 360) return { bucket: "due_6h", remainingMinutes };
  return { bucket: row.predictedLate ? "predicted_late" : row.riskBucket ?? "normal", remainingMinutes };
}

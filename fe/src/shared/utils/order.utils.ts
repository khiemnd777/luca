export function dueTodayStatusChip(deliveryStatus?: string | null): { label: string; color: string } {
  if (!deliveryStatus) return { label: "", color: "#9e9e9e" };
  const normalized = deliveryStatus.toLowerCase();
  return {
    label: deliveryStatusLabel(normalized),
    color: deliveryStatusColor(normalized),
  };
}

export function activeTodayStatusChip(status?: string | null): { label: string; color: string } {
  if (!status) return { label: "", color: "#9e9e9e" };
  const normalized = status.toLowerCase();
  return {
    label: statusLabel(normalized),
    color: statusColor(normalized),
  };
}

const ORDER_DELIVERY_STATUS_PALETTE = [
  "#9e9e9e", // pending - gray
  "#1976d2", // delivery in progress - blue
  "#d32f2f", // returned - red
  "#2e7d32", // delivered - green
];

export const ORDER_DELIVERY_STATUSES = [
  { value: "pending", label: "Chờ giao", displayOrder: 1 },
  { value: "delivery_in_progress", label: "Đang giao", displayOrder: 2 },
  { value: "returned", label: "Đã trả về", displayOrder: 3 },
  { value: "delivered", label: "Đã nhận", displayOrder: 4 },
] as const;

export type OrderDeliveryStatus = (typeof ORDER_DELIVERY_STATUSES)[number]["value"];

export const ORDER_DELIVERY_STATUS_OPTIONS = ORDER_DELIVERY_STATUSES.map(
  ({ label, value }) => ({ label, value })
);

const ORDER_DELIVERY_STATUS_HELPERS = [
  { value: "pending", label: "Số lượng đơn chờ giao" },
  { value: "delivery_in_progress", label: "Số lượng đơn đang giao" },
  { value: "delivered", label: "Số lượng đơn đã nhận" },
  { value: "returned", label: "Số lượng đơn đã trả về" },
] as const;

const DELIVERY_STATUS_COLOR_MAP = ORDER_DELIVERY_STATUSES.reduce<Record<string, string>>(
  (acc, cur, index) => {
    acc[cur.value] = ORDER_DELIVERY_STATUS_PALETTE[index] ?? "#9e9e9e";
    return acc;
  },
  {}
);

const DELIVERY_STATUS_LABEL_MAP = ORDER_DELIVERY_STATUSES.reduce<Record<string, string>>(
  (acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  },
  {}
);

const DELIVERY_STATUS_DISPLAY_ORDER_MAP = ORDER_DELIVERY_STATUSES.reduce<Record<string, number>>(
  (acc, cur) => {
    acc[cur.value] = cur.displayOrder;
    return acc;
  },
  {}
);

const DELIVERY_STATUS_HELPER_MAP = ORDER_DELIVERY_STATUS_HELPERS.reduce<Record<string, string>>(
  (acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  },
  {}
);

export function deliveryStatusLabel(value?: string | null): string {
  if (!value) return "";
  return DELIVERY_STATUS_LABEL_MAP[value] ?? value;
}

export function deliveryStatusColor(value?: string | null): string {
  if (!value) return "#9e9e9e";
  return DELIVERY_STATUS_COLOR_MAP[value] ?? "#9e9e9e";
}

export function deliveryStatusHelper(value?: string | null): string {
  if (!value) return "";
  return DELIVERY_STATUS_HELPER_MAP[value] ?? value;
}

export function deliveryStatusDisplayOrder(value?: string | null): number {
  if (!value) return 99;
  return DELIVERY_STATUS_DISPLAY_ORDER_MAP[value] ?? 99;
}

const ORDER_STATUS_PALETTE = [
  "#9e9e9e", // waiting - gray
  "#607d8b", // received - blue gray
  "#1976d2", // in progress - blue
  "#0288d1", // waiting dentist review - light blue
  "#f9a825", // qc - amber
  "#2e7d32", // completed - green
  "#d32f2f", // issue - red
  "#ef6c00", // rework - orange
];

// status
const ORDER_STATUSES = [
  { value: "waiting", label: "Đang chờ", displayOrder: 1, },
  { value: "received", label: "Đã nhận đơn", displayOrder: 2, },
  { value: "in_progress", label: "Đang gia công", displayOrder: 3, },
  { value: "waiting_dentist_review", label: "Chờ nha sĩ kiểm tra", displayOrder: 4, },
  { value: "qc", label: "Đang kiểm thử", displayOrder: 5, },
  { value: "issue", label: "Sự cố", displayOrder: 6, },
  { value: "rework", label: "Làm lại", displayOrder: 7, },
  { value: "completed", label: "Đã hoàn thành", displayOrder: 8, },
] as const;

const ORDER_STATUS_HELPERS = [
  { value: "waiting", label: "Số lượng đơn đang chờ xử lý" },
  { value: "received", label: "Số lượng đơn đã nhận" },
  { value: "in_progress", label: "Số lượng đơn đang được gia công" },
  { value: "waiting_dentist_review", label: "Số lượng đơn đang chờ nha sĩ kiểm tra" },
  { value: "qc", label: "Số lượng đơn đang kiểm tra chất lượng" },
  { value: "completed", label: "Số lượng đơn đã hoàn thành" },
  { value: "issue", label: "Số lượng đơn bị sự cố" },
  { value: "rework", label: "Số lượng đơn phải làm lại" },
] as const;

const STATUS_COLOR_MAP = ORDER_STATUSES.reduce<Record<string, string>>(
  (acc, cur, index) => {
    acc[cur.value] = ORDER_STATUS_PALETTE[index] ?? "#9e9e9e";
    return acc;
  },
  {}
);

const STATUS_LABEL_MAP = ORDER_STATUSES.reduce<Record<string, string>>(
  (acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  },
  {}
);

const STATUS_DISPLAY_ORDER_MAP = ORDER_STATUSES.reduce<Record<string, number>>(
  (acc, cur) => {
    acc[cur.value] = cur.displayOrder;
    return acc;
  },
  {}
);

const STATUS_HELPER_MAP = ORDER_STATUS_HELPERS.reduce<Record<string, string>>(
  (acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  },
  {}
);

export function statusLabel(value?: string | null): string {
  if (!value) return "";
  return STATUS_LABEL_MAP[value] ?? value;
}

export function statusColor(value?: string | null): string {
  if (!value) return "#9e9e9e";
  return STATUS_COLOR_MAP[value] ?? "#9e9e9e";
}

export function statusHelper(value?: string | null): string {
  if (!value) return "";
  return STATUS_HELPER_MAP[value] ?? value;
}

export function statusDisplayOrder(value?: string | null): number {
  if (!value) return 99;
  return STATUS_DISPLAY_ORDER_MAP[value] ?? value;
}

// priority label
const PRIORITY_STATUSES = [
  { value: "normal", label: "Bình thường" },
  { value: "high", label: "Cao" },
  { value: "urgent", label: "Khẩn cấp" },
  { value: "critical", label: "Tối khẩn" },
] as const;

const PRIORITY_LABEL_MAP = PRIORITY_STATUSES.reduce<Record<string, string>>(
  (acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  },
  {}
);

export function priorityLabel(value?: string | null): string {
  if (!value) return "";
  return PRIORITY_LABEL_MAP[value] ?? value;
}

// priority color
export const PRIORITY_COLOR_MAP: Record<string, string> = {
  normal: "#9e9e9e", // gray
  high: "#1976d2", // blue
  urgent: "#fb8c00", // orange
  critical: "#d32f2f", // red
};

export function priorityColor(value?: string | null): string {
  if (!value) return "#9e9e9e";
  return PRIORITY_COLOR_MAP[value] ?? "#9e9e9e";
}

export function planningRiskLabel(value?: string | null): string {
  switch (value) {
    case "overdue":
      return "Trễ";
    case "due_2h":
      return "<= 2h";
    case "due_4h":
      return "<= 4h";
    case "due_6h":
      return "<= 6h";
    case "predicted_late":
      return "Dự báo trễ";
    case "normal":
      return "Ổn";
    default:
      return "";
  }
}

export function planningRiskColor(value?: string | null): string {
  switch (value) {
    case "overdue":
      return "#d32f2f";
    case "due_2h":
      return "#c62828";
    case "due_4h":
      return "#ef6c00";
    case "due_6h":
      return "#f9a825";
    case "predicted_late":
      return "#ad1457";
    case "normal":
      return "#607d8b";
    default:
      return "#9e9e9e";
  }
}

export function formatPlanningMinutes(minutes?: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return "––";
  const abs = Math.abs(minutes);
  const dayMinutes = 24 * 60;
  const monthMinutes = 30 * dayMinutes;
  const yearMinutes = 12 * monthMinutes;

  let value: string;
  if (abs > yearMinutes) {
    value = `${Math.max(1, Math.floor(abs / yearMinutes))} năm`;
  } else if (abs > monthMinutes) {
    value = `${Math.max(1, Math.floor(abs / monthMinutes))} th`;
  } else if (abs > dayMinutes) {
    value = `${Math.max(1, Math.floor(abs / dayMinutes))} ng`;
  } else {
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    value = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
  }

  return minutes < 0 ? `Trễ ${value}` : `Còn ${value}`;
}

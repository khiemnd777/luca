// types
export const MATERIAL_TYPES = [
  { label: "Tiêu hao", value: "consumable" },
  { label: "Cho mượn", value: "loaner" },
] as const;

const MATERIAL_TYPE_MAP = MATERIAL_TYPES.reduce<Record<string, string>>(
  (acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  },
  {}
);

export function materialTypeLabel(value?: string | null): string {
  if (!value) return "";
  return MATERIAL_TYPE_MAP[value] ?? value;
}

export function materialDisplayLabel(input?: { name?: string | null; isImplant?: boolean } | null): string {
  if (!input) return "";
  const name = input.name?.trim() ?? "";
  return name;
}

// status
export const MATERIAL_STATUSES = [
  { label: "Đang cho mượn", value: "on_loan" },
  { label: "Thu hồi 1 phần", value: "partial_returned" },
  { label: "Đã thu hồi", value: "returned" },
] as const;

const MATERIAL_STATUS_CHIP_COLOR_MAP = {
  on_loan: "info",
  partial_returned: "warning",
  returned: "success",
} as const;

const MATERIAL_STATUS_COLOR_MAP = {
  on_loan: "#1976d2",
  partial_returned: "#ed6c02",
  returned: "#2e7d32",
} as const;

const MATERIAL_STATUS_MAP = MATERIAL_STATUSES.reduce<Record<string, string>>(
  (acc, cur) => {
    acc[cur.value] = cur.label;
    return acc;
  },
  {}
);

export function materialStatusLabel(value?: string | null): string {
  if (!value) return "";
  return MATERIAL_STATUS_MAP[value] ?? value;
}

export function materialStatusChipColor(value?: string | null): "default" | "info" | "warning" | "success" {
  if (!value) return "default";
  return MATERIAL_STATUS_CHIP_COLOR_MAP[value as keyof typeof MATERIAL_STATUS_CHIP_COLOR_MAP] ?? "default";
}

export function materialStatusColor(value?: string | null): string {
  if (!value) return "#9e9e9e";
  return MATERIAL_STATUS_COLOR_MAP[value as keyof typeof MATERIAL_STATUS_COLOR_MAP] ?? "#9e9e9e";
}

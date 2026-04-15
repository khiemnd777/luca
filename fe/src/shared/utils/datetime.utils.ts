export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "";

  const dateTimeFormat = String(import.meta.env.VITE_FORMAT_DATETIME ?? "").trim().toUpperCase();
  if (dateTimeFormat === "USA" || dateTimeFormat === "US") {
    return formatUSADateTime(value);
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export function formatDateTime12(value?: string | Date | null): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  let hours = date.getHours();
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = String(hours).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${mi} ${period}`;
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateShort(value?: string | Date | null): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const currentYear = new Date().getFullYear();

  return yyyy === currentYear ? `${dd}/${mm}` : `${dd}/${mm}/${yyyy}`;
}

export function formatUSADate(value?: string | Date | null): string {
  if (!value) return "";

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return "";

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${month}/${day}/${year}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatUSADateTime(value?: string | Date | null): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDuration(durationSec?: number | null): string {
  const totalSeconds = Math.max(0, Math.floor(durationSec ?? 0));
  if (totalSeconds === 0) return "0 phút";

  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} phút`;

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return remainingMinutes > 0
      ? `${totalHours} giờ ${remainingMinutes} phút`
      : `${totalHours} giờ`;
  }

  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  if (remainingHours > 0) return `${totalDays} ngày ${remainingHours} giờ`;
  return `${totalDays} ngày`;
}


export function formatTime24 (value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");

  return `${h}:${m}`;
};

export function formatTime12 (value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${period}`;
};

export function isToday(
  value?: string | Date | null,
  base: Date = new Date()
): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === base.getFullYear()
    && date.getMonth() === base.getMonth()
    && date.getDate() === base.getDate()
  );
}


export const fDatetime = "DD/MM/YYYY HH:mm:ss";
export const fDate = "DD/MM/YYYY";

export function serverTimeToClientDate(isoTime: string): Date | null {
  const d = new Date(isoTime);
  if (isNaN(d.getTime())) return null;
  return d;
}


export function serverTimeToClient(
  isoTime: string,
  opts?: {
    withSeconds?: boolean;
    locale?: string;
  }
) {
  const date = serverTimeToClientDate(isoTime);
  if (!date) return "";

  return date.toLocaleString(
    opts?.locale ?? undefined, // undefined = locale của browser
    {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: opts?.withSeconds ? "2-digit" : undefined,
    }
  );
}

export function formatTimeAgo(createdAt?: string | number | Date) {
  if (!createdAt) return null;
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return null;
  const diffMinutes = Math.max(1, Math.floor((Date.now() - createdMs) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} tháng trước`;
}

export function formatAgeDays(ageDays: number): string {
  if (ageDays <= 0) return "Hôm nay";
  if (ageDays < 30) return `${ageDays} ngày trước`;
  if (ageDays < 365) return `${Math.floor(ageDays / 30)} tháng trước`;
  return `${Math.floor(ageDays / 365)} năm trước`;
}


const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MONTH = MS_PER_DAY * 30;
const MS_PER_YEAR = MS_PER_DAY * 365;

const toMs = (value?: string | number | Date | null): number | null => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export function relTime(
  targetOrDiff?: string | number | Date | null,
  base?: string | number | Date | null
): { text: string; color: string } {
  let targetMs: number | null = null;
  let baseMs: number | null = null;
  const diffMs = base === undefined
    ? toMs(targetOrDiff)
    : (() => {
      targetMs = toMs(targetOrDiff);
      baseMs = toMs(base);
      if (targetMs == null || baseMs == null) return null;
      return targetMs - baseMs;
    })();

  if (diffMs == null) return { text: "", color: "" };

  if (base !== undefined && targetMs != null && baseMs != null) {
    const targetDate = new Date(targetMs);
    const baseDate = new Date(baseMs);
    if (
      targetDate.getFullYear() === baseDate.getFullYear() &&
      targetDate.getMonth() === baseDate.getMonth() &&
      targetDate.getDate() === baseDate.getDate()
    ) {
      const isLate = diffMs < 0;
      return { text: "Hôm nay", color: isLate ? "#d32f2f" : "#2e7d32" };
    }
  }

  const absMs = Math.abs(diffMs);
  let value: number;
  let unit: string;

  if (absMs < MS_PER_DAY) {
    value = Math.ceil(absMs / (60 * 60 * 1000));
    unit = "giờ";
  } else if (absMs >= MS_PER_YEAR) {
    value = Math.ceil(absMs / MS_PER_YEAR);
    unit = "năm";
  } else if (absMs >= MS_PER_MONTH) {
    value = Math.ceil(absMs / MS_PER_MONTH);
    unit = "tháng";
  } else {
    value = Math.ceil(absMs / MS_PER_DAY);
    unit = "ngày";
  }

  if (value <= 0) value = 0;

  const isLate = diffMs < 0;
  return {
    text: `${isLate ? "Chậm" : "Còn"} ${value} ${unit}`,
    color: isLate ? "#d32f2f" : "#2e7d32",
  };
}

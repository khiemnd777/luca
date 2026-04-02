import type { FetchTableOpts } from "@core/table/table.types";

export type SystemLogDirection = "forward" | "backward";
export type SystemLogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type SystemLogsFilters = {
  from?: string;
  to?: string;
  level?: string[];
  module?: string;
  service?: string;
  env?: string;
  requestId?: string;
  keyword?: string;
  userId?: string;
  departmentId?: string;
  direction?: SystemLogDirection;
};

export type SystemLogsQuery = Omit<FetchTableOpts, "direction"> & SystemLogsFilters;

export type SystemLogModel = {
  id: string;
  ts: string;
  level: string;
  module?: string | null;
  service?: string | null;
  env?: string | null;
  message: string;
  requestId?: string | null;
  userId?: string | null;
  departmentId?: string | null;
  error?: string | null;
  stacktrace?: string | null;
  raw?: unknown;
  metadata?: Record<string, unknown> | null;
};

export type SystemLogsSummaryModel = {
  warnCount: number;
  errorCount: number;
};

export type SystemLogDto = {
  id?: string | number | null;
  ts?: string | null;
  timestamp?: string | null;
  level?: string | null;
  module?: string | null;
  service?: string | null;
  env?: string | null;
  message?: string | null;
  request_id?: string | null;
  user_id?: string | number | null;
  department_id?: string | number | null;
  error?: string | null;
  stacktrace?: string | null;
  raw?: unknown;
  metadata?: Record<string, unknown> | null;
};

export type SystemLogsSummaryDto = {
  warn_count?: number | null;
  error_count?: number | null;
  warn?: number | null;
  error?: number | null;
};

export function buildSystemLogId(dto: SystemLogDto): string {
  const ts = dto.ts ?? dto.timestamp ?? "";
  const requestId = dto.request_id ?? "";
  const message = dto.message ?? "";
  const level = dto.level ?? "";
  return [ts, requestId, level, message].join("::");
}

export function normalizeSystemLog(dto: SystemLogDto): SystemLogModel {
  return {
    id: String(dto.id ?? buildSystemLogId(dto)),
    ts: dto.ts ?? dto.timestamp ?? "",
    level: String(dto.level ?? "info").toLowerCase(),
    module: dto.module ?? null,
    service: dto.service ?? null,
    env: dto.env ?? null,
    message: dto.message ?? "",
    requestId: dto.request_id != null ? String(dto.request_id) : null,
    userId: dto.user_id != null ? String(dto.user_id) : null,
    departmentId: dto.department_id != null ? String(dto.department_id) : null,
    error: dto.error ?? null,
    stacktrace: dto.stacktrace ?? null,
    raw: dto.raw,
    metadata: dto.metadata ?? null,
  };
}

export function normalizeSystemLogsSummary(dto: SystemLogsSummaryDto | null | undefined): SystemLogsSummaryModel {
  return {
    warnCount: Number(dto?.warn_count ?? dto?.warn ?? 0),
    errorCount: Number(dto?.error_count ?? dto?.error ?? 0),
  };
}

import type { ListResult } from "@core/types/list-result";
import { apiClient } from "@core/network/api-client";
import type {
  SystemLogDto,
  SystemLogModel,
  SystemLogsFilters,
  SystemLogsQuery,
  SystemLogsSummaryDto,
  SystemLogsSummaryModel,
} from "@features/observability_logs/model/system-log.model";
import {
  normalizeSystemLog,
  normalizeSystemLogsSummary,
} from "@features/observability_logs/model/system-log.model";

type LogsListResponse =
  | SystemLogDto[]
  | {
      items?: SystemLogDto[];
      data?: SystemLogDto[];
      results?: SystemLogDto[];
      total?: number | null;
      count?: number | null;
    };

function normalizeLogsList(data: LogsListResponse): ListResult<SystemLogModel> {
  if (Array.isArray(data)) {
    return {
      items: data.map(normalizeSystemLog),
      total: data.length,
    };
  }

  const items = data.items ?? data.data ?? data.results ?? [];
  return {
    items: items.map(normalizeSystemLog),
    total: typeof data.total === "number"
      ? data.total
      : (typeof data.count === "number" ? data.count : items.length),
  };
}

function normalizeLevel(level?: string[]): string | undefined {
  if (!level?.length) return undefined;
  const values = level
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return values.length ? values.join(",") : undefined;
}

type QueryParamsInput = SystemLogsFilters & {
  limit?: number;
  page?: number;
  orderBy?: string | null;
};

function buildQueryParams(params: QueryParamsInput) {
  const query = {
    level: normalizeLevel(params.level),
    from: params.from,
    to: params.to,
    module: params.module?.trim() || undefined,
    service: params.service?.trim() || undefined,
    env: params.env?.trim() || undefined,
    request_id: params.requestId?.trim() || undefined,
    keyword: params.keyword?.trim() || undefined,
    user_id: params.userId?.trim() || undefined,
    department_id: params.departmentId?.trim() || undefined,
    limit: params.limit,
    direction: params.direction ?? "backward",
    page: params.page,
    order_by: params.orderBy ?? undefined,
  };

  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== "")
  );
}

export async function getLogs(params: SystemLogsQuery): Promise<ListResult<SystemLogModel>> {
  const { data } = await apiClient.get<LogsListResponse>("/api/observability/logs", {
    params: buildQueryParams(params),
  });

  return normalizeLogsList(data);
}

export async function getLogsSummary(params: SystemLogsFilters): Promise<SystemLogsSummaryModel> {
  const { data } = await apiClient.get<SystemLogsSummaryDto>("/api/observability/logs/summary", {
    params: buildQueryParams(params),
  });

  return normalizeSystemLogsSummary(data);
}

import type { AuditLog } from "./types";
export type { AuditLog } from "./types";

export type AuditLogListResponse = {
  data: AuditLog[];
  has_more: boolean;
};

export type AuditLogListParams = {
  module?: string;
  target_id?: number;
  page: number;
  limit: number;
};

type HttpClientLike = {
  get<T>(url: string, config?: { params?: Record<string, unknown> }): Promise<{ data: T } | T>;
};

export async function fetchAuditLogs(
  http: HttpClientLike,
  params: AuditLogListParams
): Promise<AuditLogListResponse> {
  const response = await http.get<AuditLogListResponse>("/api/audit", { params });
  const payload =
    response && typeof response === "object" && "data" in response
      ? (response as { data: AuditLogListResponse }).data
      : (response as AuditLogListResponse);

  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    has_more: Boolean(payload?.has_more),
  };
}

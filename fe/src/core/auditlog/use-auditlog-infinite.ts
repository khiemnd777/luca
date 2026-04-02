import * as React from "react";
import type { AuditLog } from "./types";
import { fetchAuditLogs } from "./auditlog.api";

type HttpClientLike = {
  get<T>(url: string, config?: { params?: Record<string, unknown> }): Promise<{ data: T } | T>;
};

export type AuditLogInfiniteFilters = {
  module?: string;
  target_id?: number;
  limit: number;
};

type UseAuditLogInfiniteResult = {
  items: AuditLog[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  reset: () => void;
};

function dedupeById(items: AuditLog[]): AuditLog[] {
  const byId = new Map<string, AuditLog>();
  for (const item of items) {
    byId.set(String(item.id), item);
  }
  return Array.from(byId.values());
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load audit logs.";
}

export function useAuditLogInfinite(
  http: HttpClientLike,
  filters: AuditLogInfiniteFilters
): UseAuditLogInfiniteResult {
  const [items, setItems] = React.useState<AuditLog[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filtersRef = React.useRef(filters);
  const requestVersionRef = React.useRef(0);
  const pageRef = React.useRef(1);
  const hasMoreRef = React.useRef(true);
  const loadingRef = React.useRef(false);
  const loadedPagesRef = React.useRef<Set<number>>(new Set());
  const inFlightPagesRef = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);

  React.useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  React.useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const loadPage = React.useCallback(
    async (targetPage: number, replace: boolean, force = false) => {
      const version = requestVersionRef.current;

      if (!force && !hasMoreRef.current) return;
      if (inFlightPagesRef.current.has(targetPage)) return;
      if (loadedPagesRef.current.has(targetPage)) return;

      inFlightPagesRef.current.add(targetPage);
      setLoading(true);
      setError(null);

      try {
        const response = await fetchAuditLogs(http, {
          module: filtersRef.current.module,
          target_id: filtersRef.current.target_id,
          page: targetPage,
          limit: filtersRef.current.limit,
        });

        if (version !== requestVersionRef.current) return;

        loadedPagesRef.current.add(targetPage);
        setItems((prev) => dedupeById(replace ? response.data : [...prev, ...response.data]));
        setPage(targetPage);
        setHasMore(response.has_more);
      } catch (err) {
        if (version !== requestVersionRef.current) return;
        setError(getErrorMessage(err));
      } finally {
        inFlightPagesRef.current.delete(targetPage);
        if (version === requestVersionRef.current) {
          setLoading(false);
        }
      }
    },
    [http]
  );

  const refresh = React.useCallback(() => {
    requestVersionRef.current += 1;
    inFlightPagesRef.current.clear();
    loadedPagesRef.current.clear();
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    void loadPage(1, true, true);
  }, [loadPage]);

  const reset = React.useCallback(() => {
    refresh();
  }, [refresh]);

  const loadMore = React.useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    const nextPage = pageRef.current + 1;
    void loadPage(nextPage, false);
  }, [loadPage]);

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.module, filters.target_id, filters.limit]);

  React.useEffect(
    () => () => {
      requestVersionRef.current += 1;
      inFlightPagesRef.current.clear();
    },
    []
  );

  return {
    items,
    page,
    hasMore,
    loading,
    error,
    loadMore,
    refresh,
    reset,
  };
}

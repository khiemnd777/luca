import * as React from "react";
import { Alert, Stack } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { BasePage } from "@core/pages/base-page";
import { PageContainer } from "@shared/components/ui/page-container";
import { SectionCard } from "@shared/components/ui/section-card";
import { AutoTable } from "@core/table/auto-table";
import { getTableSchema } from "@core/table/table-registry";
import { useAsync } from "@core/hooks/use-async";
import { getLogsSummary } from "@features/observability_logs/api/system-logs.api";
import { SystemLogFilterBar } from "@features/observability_logs/components/system-log-filter-bar";
import { SystemLogSummaryCards } from "@features/observability_logs/components/system-log-summary-cards";
import { SystemLogDetailDrawer } from "@features/observability_logs/components/system-log-detail-drawer";
import type { SystemLogModel, SystemLogsFilters } from "@features/observability_logs/model/system-log.model";
import { normalizeSystemLogsSummary } from "@features/observability_logs/model/system-log.model";

const DEFAULT_LEVELS = ["warn", "error"];

function toRfc3339(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function fromSearchParams(searchParams: URLSearchParams): SystemLogsFilters {
  const level = searchParams.get("level");
  return {
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    level: level ? level.split(",").filter(Boolean) : DEFAULT_LEVELS,
    module: searchParams.get("module") ?? "",
    service: searchParams.get("service") ?? "",
    env: searchParams.get("env") ?? "",
    requestId: searchParams.get("request_id") ?? "",
    keyword: searchParams.get("keyword") ?? "",
    userId: searchParams.get("user_id") ?? "",
    departmentId: searchParams.get("department_id") ?? "",
    direction: (searchParams.get("direction") as SystemLogsFilters["direction"]) ?? "backward",
  };
}

function writeSearchParams(next: SystemLogsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.level?.length) params.set("level", next.level.join(","));
  if (next.module) params.set("module", next.module);
  if (next.service) params.set("service", next.service);
  if (next.env) params.set("env", next.env);
  if (next.requestId) params.set("request_id", next.requestId);
  if (next.keyword) params.set("keyword", next.keyword);
  if (next.userId) params.set("user_id", next.userId);
  if (next.departmentId) params.set("department_id", next.departmentId);
  if (next.direction) params.set("direction", next.direction);
  return params;
}

function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

export default function SystemLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRow, setSelectedRow] = React.useState<SystemLogModel | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [keywordInput, setKeywordInput] = React.useState(() => searchParams.get("keyword") ?? "");
  const debouncedKeyword = useDebouncedValue(keywordInput);

  React.useEffect(() => {
    setKeywordInput(searchParams.get("keyword") ?? "");
  }, [searchParams]);

  const filters = React.useMemo(() => fromSearchParams(searchParams), [searchParams]);

  React.useEffect(() => {
    const currentKeyword = searchParams.get("keyword") ?? "";
    if (debouncedKeyword === currentKeyword) return;
    const next = {
      ...filters,
      keyword: debouncedKeyword,
    };
    setSearchParams(writeSearchParams(next), { replace: true });
  }, [debouncedKeyword, filters, searchParams, setSearchParams]);

  const effectiveFilters = React.useMemo<SystemLogsFilters>(() => ({
    ...filters,
    from: toRfc3339(filters.from),
    to: toRfc3339(filters.to),
    keyword: debouncedKeyword.trim(),
  }), [debouncedKeyword, filters]);

  const tableParams = React.useMemo(() => ({
    ...effectiveFilters,
    refreshKey,
  }), [effectiveFilters, refreshKey]);

  const baseSchema = React.useMemo(() => getTableSchema<SystemLogModel>("system-logs"), []);
  const tableSchema = React.useMemo(() => {
    if (!baseSchema) return null;
    return {
      ...baseSchema,
      onRowClick: (row: SystemLogModel) => setSelectedRow(row),
    };
  }, [baseSchema]);

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = useAsync(
    () => getLogsSummary(effectiveFilters),
    [effectiveFilters, refreshKey],
  );

  const handleFilterChange = React.useCallback((patch: Partial<SystemLogsFilters>) => {
    const next = {
      ...filters,
      ...patch,
    };
    setSearchParams(writeSearchParams(next), { replace: true });
  }, [filters, setSearchParams]);

  const handleRefresh = React.useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const handleReset = React.useCallback(() => {
    setKeywordInput("");
    setSearchParams(writeSearchParams({
      level: DEFAULT_LEVELS,
      direction: "backward",
    }), { replace: true });
    setRefreshKey((current) => current + 1);
  }, [setSearchParams]);

  return (
    <BasePage>
      <PageContainer>
        <Stack spacing={2}>
          <SystemLogSummaryCards summary={summary ?? normalizeSystemLogsSummary(undefined)} />

          {summaryError ? (
            <Alert severity="error">
              {summaryError instanceof Error ? summaryError.message : "Không thể tải log summary."}
            </Alert>
          ) : null}

          <SystemLogFilterBar
            value={filters}
            keywordInput={keywordInput}
            loading={summaryLoading}
            onChange={handleFilterChange}
            onKeywordInputChange={setKeywordInput}
            onRefresh={handleRefresh}
            onReset={handleReset}
          />

          <SectionCard title="System Logs">
            {tableSchema ? (
              <AutoTable schema={tableSchema} params={tableParams} />
            ) : (
              <Alert severity="error">Không tìm thấy bảng system logs.</Alert>
            )}
          </SectionCard>
        </Stack>

        <SystemLogDetailDrawer
          open={!!selectedRow}
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      </PageContainer>
    </BasePage>
  );
}

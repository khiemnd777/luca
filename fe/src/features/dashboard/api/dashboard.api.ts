import dayjs from "dayjs";
import { useAsync } from "@core/hooks/use-async";
import { mapper } from "@core/mapper/auto-mapper";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import type {
  AvgRemakeRateResult,
  AvgRemakeRateResultDto,
  AvgTurnaroundResult,
  AvgTurnaroundResultDto,
  CasesMetricResult,
  CasesMetricResultDto,
  CaseStatusItemDto,
  CaseStatusItemModel,
  DueTodayItem,
  DueTodayItemDto,
  DashboardCompareParams,
  DashboardCompareParamsDto,
  ActiveTodayItem,
  ActiveTodayItemDto,
  SalesDailyItem,
  SalesDailyItemDto,
  SalesDailyParams,
  SalesDailyParamsDto,
  SalesReportRange,
  SalesReportResult,
  SalesReportResultDto,
  SalesSummaryModel,
  SalesSummaryDto,
} from "../model/dashboard.model";

export type DashboardStat = {
  value: number | string;
  delta?: string;
  caption?: string;
};

type CaseStatusColor = NonNullable<CaseStatusItemModel["color"]>;

const CASE_STATUS_COLORS = new Set<CaseStatusColor>([
  "primary",
  "secondary",
  "error",
  "info",
  "success",
  "warning",
  "inherit",
]);

function toQuery(params: DashboardCompareParams): DashboardCompareParamsDto {
  const dto = mapper.map<DashboardCompareParams, DashboardCompareParamsDto>(
    "Dashboard",
    params,
    "model_to_dto",
  );

  const query: DashboardCompareParamsDto = {
    from_date: dto.from_date,
    to_date: dto.to_date,
    previous_from_date: dto.previous_from_date,
    previous_to_date: dto.previous_to_date,
  };

  if (dto.department_id != null) {
    query.department_id = dto.department_id;
  }

  return query;
}

function toDailyQuery(params: SalesDailyParams): SalesDailyParamsDto {
  const dto = mapper.map<SalesDailyParams, SalesDailyParamsDto>(
    "Dashboard",
    params,
    "model_to_dto",
  );

  const query: SalesDailyParamsDto = {
    from_date: dto.from_date,
    to_date: dto.to_date,
  };

  if (dto.department_id != null) {
    query.department_id = dto.department_id;
  }

  return query;
}

async function getDashboardMetric<TModel, TDto>(
  path: string,
  params: DashboardCompareParams,
): Promise<TModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<TDto>(`${departmentApiPath()}${path}`, {
    params: toQuery(params),
  });
  return mapper.map<TDto, TModel>("Dashboard", data, "dto_to_model");
}

export async function fetchDueToday(): Promise<DueTodayItem[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<DueTodayItemDto[]>(
    `${departmentApiPath()}/dashboard/due-today`,
  );

  const mapped = mapper.map<DueTodayItemDto[], DueTodayItem[]>(
    "Dashboard",
    data,
    "dto_to_model",
  );

  return (mapped ?? []).map((item) => ({
    id: item.id,
    code: item.code ?? "",
    dentist: item.dentist ?? "",
    patient: item.patient ?? "",
    deliveryAt: item.deliveryAt ?? "",
    ageDays: item.ageDays ?? 0,
    dueType: item.dueType ?? "today",
    priority: (item.priority ?? "standard").toLowerCase(),
    status: item.status?.toLowerCase(),
    deliveryStatus: item.deliveryStatus?.toLowerCase(),
  }));
}

export async function fetchActiveToday(): Promise<ActiveTodayItem[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<ActiveTodayItemDto[]>(
    `${departmentApiPath()}/dashboard/active-today`,
  );

  const mapped = mapper.map<DueTodayItemDto[], ActiveTodayItem[]>(
    "Dashboard",
    data,
    "dto_to_model",
  );

  return (mapped ?? []).map((item) => ({
    id: item.id,
    code: item.code ?? "",
    dentist: item.dentist ?? "",
    patient: item.patient ?? "",
    deliveryAt: item.deliveryAt ?? "",
    createdAt: item.createdAt ?? "",
    ageDays: item.ageDays ?? 0,
    priority: (item.priority ?? "standard").toLowerCase(),
    status: item.status?.toLowerCase(),
  }));
}

function normalizeCaseStatusItem(item: CaseStatusItemModel): CaseStatusItemModel {
  const count = Number.isFinite(item.count) ? item.count : 0;
  const target = Number.isFinite(item.target) && (item.target ?? 0) > 0 ? item.target : undefined;
  const label = item.label?.trim() ? item.label : item.status ?? "";
  const status = item.status?.trim() ? item.status : label;
  const color: CaseStatusColor =
    typeof item.color === "string" && CASE_STATUS_COLORS.has(item.color as CaseStatusColor)
      ? (item.color as CaseStatusColor)
      : "primary";

  return {
    status,
    label,
    count,
    target,
    color,
    helper: item.helper ?? "",
  };
}

export async function fetchCaseStatuses(): Promise<CaseStatusItemModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<CaseStatusItemDto[]>(
    `${departmentApiPath()}/dashboard/case-statuses`,
  );

  const mapped = mapper.map<CaseStatusItemDto[], CaseStatusItemModel[]>(
    "Dashboard",
    data,
    "dto_to_model",
  );

  return (mapped ?? []).map(normalizeCaseStatusItem);
}

export function fetchAvgTurnaround(
  params: DashboardCompareParams,
): Promise<AvgTurnaroundResult> {
  return getDashboardMetric<AvgTurnaroundResult, AvgTurnaroundResultDto>(
    "/dashboard/case-daily-stats/avg-turnaround",
    params,
  );
}

export function fetchAvgRemakeRate(
  params: DashboardCompareParams,
): Promise<AvgRemakeRateResult> {
  return getDashboardMetric<AvgRemakeRateResult, AvgRemakeRateResultDto>(
    "/dashboard/case-daily-remake-stats/avg-remake-rate",
    params,
  );
}

export function fetchCompletedCases(
  params: DashboardCompareParams,
): Promise<CasesMetricResult> {
  return getDashboardMetric<CasesMetricResult, CasesMetricResultDto>(
    "/dashboard/case-daily-completed-stats/completed-cases",
    params,
  );
}

export function fetchActiveCases(
  params: DashboardCompareParams,
): Promise<CasesMetricResult> {
  return getDashboardMetric<CasesMetricResult, CasesMetricResultDto>(
    "/dashboard/case-daily-active-stats/active-cases",
    params,
  );
}

export function fetchSalesSummary(
  params: DashboardCompareParams,
): Promise<SalesSummaryModel> {
  return getDashboardMetric<SalesSummaryModel, SalesSummaryDto>(
    "/dashboard/case-daily-sales-stats/summary",
    params,
  );
}

function buildCompareRangeParams(range: SalesReportRange): DashboardCompareParams {
  const now = dayjs();
  let start = now.startOf("day");
  let end = now.endOf("day");

  if (range === "7d") {
    start = now.subtract(6, "day").startOf("day");
    end = now.endOf("day");
  } else if (range === "30d") {
    start = now.subtract(29, "day").startOf("day");
    end = now.endOf("day");
  }

  const totalDays = Math.max(1, end.startOf("day").diff(start.startOf("day"), "day") + 1);
  const prevStart = start.subtract(totalDays, "day");
  const prevEnd = end.subtract(totalDays, "day");

  return {
    fromDate: start.toISOString(),
    toDate: end.toISOString(),
    previousFromDate: prevStart.toISOString(),
    previousToDate: prevEnd.toISOString(),
  };
}

export function useSalesSummary(range: SalesReportRange = "7d") {
  return useAsync<SalesSummaryModel>(
    async () => fetchSalesSummary(buildCompareRangeParams(range)),
    [range],
    { key: "dashboard:sales-summary" },
  );
}

export async function fetchSalesDaily(
  params: SalesDailyParams,
): Promise<SalesDailyItem[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<SalesDailyItemDto[]>(
    `${departmentApiPath()}/dashboard/case-daily-sales-stats/daily`,
    { params: toDailyQuery(params) },
  );

  const mapped = mapper.map<SalesDailyItemDto[], SalesDailyItem[]>(
    "Dashboard",
    data,
    "dto_to_model",
  );

  return (mapped ?? []).map((item) => ({
    date: item.date ?? "",
    revenue: Number.isFinite(item.revenue) ? item.revenue : 0,
  }));
}

function buildSalesDailyParams(range: SalesReportRange): SalesDailyParams {
  const now = dayjs();
  let start = now.startOf("day");
  let end = now.endOf("day");

  if (range === "7d") {
    start = now.subtract(6, "day").startOf("day");
    end = now.endOf("day");
  } else if (range === "30d") {
    start = now.subtract(29, "day").startOf("day");
    end = now.endOf("day");
  }

  return {
    fromDate: start.toISOString(),
    toDate: end.toISOString(),
  };
}

export function useSalesDaily(range: SalesReportRange = "7d") {
  return useAsync<SalesDailyItem[]>(
    async () => fetchSalesDaily(buildSalesDailyParams(range)),
    [range],
    { key: "dashboard:sales-daily" },
  );
}

export async function fetchSalesReport(
  range: SalesReportRange,
): Promise<SalesReportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<SalesReportResultDto>(
    `${departmentApiPath()}/dashboard/case-daily-sales-stats/report`,
    { params: { range } },
  );

  const summary = mapper.map<SalesSummaryDto, SalesSummaryModel>(
    "Dashboard",
    data?.summary ?? {},
    "dto_to_model",
  );
  const daily = mapper.map<SalesDailyItemDto[], SalesDailyItem[]>(
    "Dashboard",
    data?.daily ?? [],
    "dto_to_model",
  );

  return {
    summary: {
      totalRevenue: Number.isFinite(summary.totalRevenue) ? summary.totalRevenue : 0,
      orderItemsCount: Number.isFinite(summary.orderItemsCount) ? summary.orderItemsCount : 0,
      prevRevenue: Number.isFinite(summary.prevRevenue) ? summary.prevRevenue : 0,
      growthPercent:
        summary.growthPercent == null || Number.isFinite(summary.growthPercent)
          ? summary.growthPercent ?? null
          : null,
    },
    daily: (daily ?? []).map((item) => ({
      date: item.date ?? "",
      revenue: Number.isFinite(item.revenue) ? item.revenue : 0,
    })),
  };
}

export function useSalesReport(range: SalesReportRange) {
  return useAsync<SalesReportResult>(
    async () => fetchSalesReport(range),
    [],
    { key: "dashboard:sales-report" },
  );
}

function formatDelta(delta: number, suffix: string): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} ${suffix}`;
}

function rangeSuffix(range: SalesReportRange) {
  if (range === "today") return "hôm nay";
  if (range === "7d") return "7 ngày";
  return "30 ngày";
}

export function useActiveCasesToday(range: SalesReportRange = "today") {
  return useAsync<DashboardStat>(
    async () => {
      const res = await fetchActiveCases(buildCompareRangeParams(range));
      return {
        value: res.value,
        delta: formatDelta(res.delta, rangeSuffix(range)),
      };
    },
    [range],
    { key: "dashboard:active-cases-today" },
  );
}

export function useCasesCompletedThisWeek(range: SalesReportRange = "7d") {
  return useAsync<DashboardStat>(
    async () => {
      const res = await fetchCompletedCases(buildCompareRangeParams(range));
      return {
        value: res.value,
        delta: formatDelta(res.delta, rangeSuffix(range)),
      };
    },
    [range],
    { key: "dashboard:cases-completed-week" },
  );
}

export function useAvgTurnaround(range: SalesReportRange = "7d") {
  return useAsync<DashboardStat>(
    async () => {
      const res = await fetchAvgTurnaround(buildCompareRangeParams(range));
      const avgDays = Number.isFinite(res.avgDays) ? res.avgDays : 0;
      const deltaDays = Number.isFinite(res.deltaDays) ? res.deltaDays : 0;
      const sign = deltaDays > 0 ? "+" : "";

      return {
        value: `${avgDays.toFixed(1)} ngày`,
        delta: `${sign}${deltaDays.toFixed(1)}`,
        caption: "so với kỳ trước", //"vs previous period",
      };
    },
    [range],
    { key: "dashboard:avg-turnaround" },
  );
}

export function useAvgRemakeRate(range: SalesReportRange = "7d") {
  return useAsync<DashboardStat>(
    async () => {
      const res = await fetchAvgRemakeRate(buildCompareRangeParams(range));
      const rate = Number.isFinite(res.rate) ? res.rate : 0;
      const deltaRate = Number.isFinite(res.deltaRate) ? res.deltaRate : 0;
      const sign = deltaRate > 0 ? "+" : "";

      return {
        value: `${(rate * 100).toFixed(1)}%`,
        delta: `${sign}${(deltaRate * 100).toFixed(1)}%`,
        caption: "làm lại",
      };
    },
    [range],
    { key: "dashboard:avg-remake-rate" },
  );
}

export function useDueToday() {
  return useAsync<DueTodayItem[]>(
    async () => fetchDueToday(),
    [],
    { key: "dashboard:due-today" },
  );
}

export function useActiveToday() {
  return useAsync<ActiveTodayItem[]>(
    async () => fetchActiveToday(),
    [],
    { key: "dashboard:active-today" },
  );
}

export function useCaseStatuses() {
  return useAsync<CaseStatusItemModel[]>(
    async () => fetchCaseStatuses(),
    [],
    { key: "dashboard:case-statuses" },
  );
}

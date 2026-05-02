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
  ProductionPlanningOverview,
  ProductionPlanningOverviewDto,
  ProductionPlanningConfig,
  ProductionPlanningConfigDto,
  ProductionPlanningRecommendation,
  ProductionPlanningRecommendationDto,
  ProductionPlanningRiskItem,
  ProductionPlanningRiskItemDto,
  ProductionPlanningBottleneck,
  ProductionPlanningBottleneckDto,
} from "../model/dashboard.model";

export type DashboardStat = {
  value: number | string;
  delta?: string;
  caption?: string;
};

type DashboardQueryOptions = {
  departmentId?: number | null;
  cacheNamespace?: string;
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

function toDepartmentQuery(departmentId?: number | null) {
  if (departmentId == null) return undefined;
  return { department_id: departmentId };
}

function buildScopedKey(
  baseKey: string,
  options?: DashboardQueryOptions,
  extra?: string,
) {
  const namespace = options?.cacheNamespace ?? "home";
  const departmentKey = options?.departmentId ?? "current";
  return [baseKey, namespace, departmentKey, extra].filter(Boolean).join(":");
}

function normalizePlanningConfig(input?: ProductionPlanningConfig | ProductionPlanningConfigDto | null): ProductionPlanningConfig {
  const value = input ?? {};
  const camelConfig = value as ProductionPlanningConfig;
  const dtoConfig = value as ProductionPlanningConfigDto;
  const businessHours = camelConfig.businessHours ?? dtoConfig.business_hours ?? {};
  const camelBusinessHours = businessHours as ProductionPlanningConfig["businessHours"];
  const dtoBusinessHours = businessHours as ProductionPlanningConfigDto["business_hours"];
  return {
    departmentId: camelConfig.departmentId ?? dtoConfig.department_id,
    enabled: camelConfig.enabled ?? dtoConfig.enabled ?? true,
    configComplete: camelConfig.configComplete ?? dtoConfig.config_complete ?? false,
    defaultDurationMin: camelConfig.defaultDurationMin ?? dtoConfig.default_duration_min ?? 0,
    businessHours: {
      startHour: camelBusinessHours?.startHour ?? dtoBusinessHours?.start_hour ?? 8,
      endHour: camelBusinessHours?.endHour ?? dtoBusinessHours?.end_hour ?? 17,
      workDays: camelBusinessHours?.workDays ?? dtoBusinessHours?.work_days ?? [1, 2, 3, 4, 5, 6],
    },
    processDurations: camelConfig.processDurations ?? dtoConfig.process_durations ?? {},
    sectionCapacity: camelConfig.sectionCapacity ?? dtoConfig.section_capacity ?? {},
    staffCapacity: camelConfig.staffCapacity ?? dtoConfig.staff_capacity ?? {},
    disabledSections: camelConfig.disabledSections ?? dtoConfig.disabled_sections ?? [],
    disabledStaff: camelConfig.disabledStaff ?? dtoConfig.disabled_staff ?? [],
  };
}

function planningConfigToDto(input: ProductionPlanningConfig): ProductionPlanningConfigDto {
  return {
    department_id: input.departmentId,
    enabled: input.enabled,
    config_complete: input.configComplete,
    default_duration_min: input.defaultDurationMin,
    business_hours: {
      start_hour: input.businessHours.startHour,
      end_hour: input.businessHours.endHour,
      work_days: input.businessHours.workDays,
    },
    process_durations: input.processDurations,
    section_capacity: input.sectionCapacity,
    staff_capacity: input.staffCapacity,
    disabled_sections: input.disabledSections,
    disabled_staff: input.disabledStaff,
  };
}

function normalizeRecommendation(input?: ProductionPlanningRecommendationDto | null): ProductionPlanningRecommendation | null {
  if (!input?.id) return null;
  return {
    id: input.id,
    type: input.type ?? "assign",
    status: input.status ?? "pending",
    reason: input.reason ?? "",
    orderId: input.order_id ?? 0,
    orderItemId: input.order_item_id ?? 0,
    inProgressId: input.in_progress_id ?? 0,
    assignedUserId: input.assigned_user_id,
    assignedName: input.assigned_name,
    targetUserId: input.target_user_id ?? 0,
    targetName: input.target_name ?? "",
    expectedRiskDelta: input.expected_risk_delta,
  };
}

function normalizeRiskItem(input: ProductionPlanningRiskItemDto): ProductionPlanningRiskItem {
  return {
    orderId: input.order_id ?? 0,
    orderItemId: input.order_item_id ?? 0,
    inProgressId: input.in_progress_id,
    orderCode: input.order_code,
    orderItemCode: input.order_item_code,
    processName: input.process_name,
    sectionName: input.section_name,
    assignedUserId: input.assigned_user_id,
    assignedName: input.assigned_name,
    startedAt: input.started_at,
    eta: input.eta,
    deliveryAt: input.delivery_at,
    remainingMinutes: input.remaining_minutes,
    lateByMinutes: input.late_by_minutes,
    riskScore: input.risk_score ?? 0,
    riskBucket: input.risk_bucket ?? "normal",
    predictedLate: input.predicted_late ?? false,
    activeAgeMinutes: input.active_age_minutes,
    remainingWorkMinutes: input.remaining_work_minutes,
    recommendedAction: normalizeRecommendation(input.recommended_action),
  };
}

function normalizeBottleneck(input: ProductionPlanningBottleneckDto): ProductionPlanningBottleneck {
  return {
    key: input.key ?? "",
    type: input.type ?? "",
    label: input.label ?? "",
    activeCount: input.active_count ?? 0,
    overdueCount: input.overdue_count ?? 0,
    predictedLateCount: input.predicted_late_count ?? 0,
    loadMinutes: input.load_minutes ?? 0,
    capacityMultiplier: input.capacity_multiplier ?? 1,
    nearestDeliveryAt: input.nearest_delivery_at,
    topRiskScore: input.top_risk_score ?? 0,
  };
}

function normalizePlanningOverview(input: ProductionPlanningOverviewDto): ProductionPlanningOverview {
  return {
    serverNow: input.server_now ?? new Date().toISOString(),
    config: normalizePlanningConfig(input.config),
    summary: {
      overdue: input.summary?.overdue ?? 0,
      due2h: input.summary?.due_2h ?? 0,
      due4h: input.summary?.due_4h ?? 0,
      due6h: input.summary?.due_6h ?? 0,
      predictedLate: input.summary?.predicted_late ?? 0,
      recoverable: input.summary?.recoverable ?? 0,
      blocked: input.summary?.blocked ?? 0,
    },
    riskItems: (input.risk_items ?? []).map(normalizeRiskItem),
    bottlenecks: (input.bottlenecks ?? []).map(normalizeBottleneck),
    recommendations: (input.recommendations ?? [])
      .map(normalizeRecommendation)
      .filter((item): item is ProductionPlanningRecommendation => Boolean(item)),
  };
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

export async function fetchDueToday(
  departmentId?: number | null,
): Promise<DueTodayItem[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<DueTodayItemDto[]>(
    `${departmentApiPath()}/dashboard/due-today`,
    {
      params: toDepartmentQuery(departmentId),
    },
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

export async function fetchActiveToday(
  departmentId?: number | null,
): Promise<ActiveTodayItem[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<ActiveTodayItemDto[]>(
    `${departmentApiPath()}/dashboard/active-today`,
    {
      params: toDepartmentQuery(departmentId),
    },
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

export async function fetchCaseStatuses(
  departmentId?: number | null,
): Promise<CaseStatusItemModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<CaseStatusItemDto[]>(
    `${departmentApiPath()}/dashboard/case-statuses`,
    {
      params: toDepartmentQuery(departmentId),
    },
  );

  const mapped = mapper.map<CaseStatusItemDto[], CaseStatusItemModel[]>(
    "Dashboard",
    data,
    "dto_to_model",
  );

  return (mapped ?? []).map(normalizeCaseStatusItem);
}

export async function fetchProductionPlanningOverview(
  departmentId?: number | null,
): Promise<ProductionPlanningOverview> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<ProductionPlanningOverviewDto>(
    `${departmentApiPath()}/dashboard/production-planning/overview`,
    {
      params: toDepartmentQuery(departmentId),
    },
  );
  return normalizePlanningOverview(data);
}

export async function fetchProductionPlanningConfig(
  departmentId?: number | null,
): Promise<ProductionPlanningConfig> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<ProductionPlanningConfigDto>(
    `${departmentApiPath()}/dashboard/production-planning/config`,
    {
      params: toDepartmentQuery(departmentId),
    },
  );
  return normalizePlanningConfig(data);
}

export async function saveProductionPlanningConfig(
  config: ProductionPlanningConfig,
): Promise<ProductionPlanningConfig> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.put<ProductionPlanningConfigDto>(
    `${departmentApiPath()}/dashboard/production-planning/config`,
    planningConfigToDto(config),
  );
  return normalizePlanningConfig(data);
}

export async function applyProductionPlanningRecommendation(
  recommendationId: string,
  adminNote?: string,
): Promise<ProductionPlanningRecommendation | null> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<{ recommendation?: ProductionPlanningRecommendationDto }>(
    `${departmentApiPath()}/dashboard/production-planning/recommendations/${encodeURIComponent(recommendationId)}/apply`,
    {
      admin_note: adminNote || undefined,
    },
  );
  return normalizeRecommendation(data.recommendation);
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

function buildCompareRangeParams(
  range: SalesReportRange,
  departmentId?: number | null,
): DashboardCompareParams {
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
    departmentId,
    fromDate: start.toISOString(),
    toDate: end.toISOString(),
    previousFromDate: prevStart.toISOString(),
    previousToDate: prevEnd.toISOString(),
  };
}

export function useSalesSummary(
  range: SalesReportRange = "7d",
  options?: DashboardQueryOptions,
) {
  return useAsync<SalesSummaryModel>(
    async () => fetchSalesSummary(buildCompareRangeParams(range, options?.departmentId)),
    [range, options?.departmentId],
    {
      key: buildScopedKey("dashboard:sales-summary", options, range),
      invalidateEvent: "invalidate:dashboard:sales-summary",
    },
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

function buildSalesDailyParams(
  range: SalesReportRange,
  departmentId?: number | null,
): SalesDailyParams {
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
    departmentId,
    fromDate: start.toISOString(),
    toDate: end.toISOString(),
  };
}

export function useSalesDaily(
  range: SalesReportRange = "7d",
  options?: DashboardQueryOptions,
) {
  return useAsync<SalesDailyItem[]>(
    async () => fetchSalesDaily(buildSalesDailyParams(range, options?.departmentId)),
    [range, options?.departmentId],
    {
      key: buildScopedKey("dashboard:sales-daily", options, range),
      invalidateEvent: "invalidate:dashboard:sales-daily",
    },
  );
}

export async function fetchSalesReport(
  range: SalesReportRange,
  departmentId?: number | null,
): Promise<SalesReportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<SalesReportResultDto>(
    `${departmentApiPath()}/dashboard/case-daily-sales-stats/report`,
    { params: { range, ...toDepartmentQuery(departmentId) } },
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

export function useSalesReport(range: SalesReportRange, options?: DashboardQueryOptions) {
  return useAsync<SalesReportResult>(
    async () => fetchSalesReport(range, options?.departmentId),
    [range, options?.departmentId],
    {
      key: buildScopedKey("dashboard:sales-report", options, range),
      invalidateEvent: "invalidate:dashboard:sales-report",
    },
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

export function useActiveCasesToday(
  range: SalesReportRange = "today",
  options?: DashboardQueryOptions,
) {
  return useAsync<DashboardStat>(
    async () => {
      const res = await fetchActiveCases(buildCompareRangeParams(range, options?.departmentId));
      return {
        value: res.value,
        delta: formatDelta(res.delta, rangeSuffix(range)),
      };
    },
    [range, options?.departmentId],
    {
      key: buildScopedKey("dashboard:active-cases-today", options, range),
      invalidateEvent: "invalidate:dashboard:active-cases-today",
    },
  );
}

export function useCasesCompletedThisWeek(
  range: SalesReportRange = "7d",
  options?: DashboardQueryOptions,
) {
  return useAsync<DashboardStat>(
    async () => {
      const res = await fetchCompletedCases(buildCompareRangeParams(range, options?.departmentId));
      return {
        value: res.value,
        delta: formatDelta(res.delta, rangeSuffix(range)),
      };
    },
    [range, options?.departmentId],
    {
      key: buildScopedKey("dashboard:cases-completed-week", options, range),
      invalidateEvent: "invalidate:dashboard:cases-completed-week",
    },
  );
}

export function useAvgTurnaround(
  range: SalesReportRange = "7d",
  options?: DashboardQueryOptions,
) {
  return useAsync<DashboardStat>(
    async () => {
      const res = await fetchAvgTurnaround(buildCompareRangeParams(range, options?.departmentId));
      const avgDays = Number.isFinite(res.avgDays) ? res.avgDays : 0;
      const deltaDays = Number.isFinite(res.deltaDays) ? res.deltaDays : 0;
      const sign = deltaDays > 0 ? "+" : "";

      return {
        value: `${avgDays.toFixed(1)} ngày`,
        delta: `${sign}${deltaDays.toFixed(1)}`,
        caption: "so với kỳ trước", //"vs previous period",
      };
    },
    [range, options?.departmentId],
    {
      key: buildScopedKey("dashboard:avg-turnaround", options, range),
      invalidateEvent: "invalidate:dashboard:avg-turnaround",
    },
  );
}

export function useAvgRemakeRate(
  range: SalesReportRange = "7d",
  options?: DashboardQueryOptions,
) {
  return useAsync<DashboardStat>(
    async () => {
      const res = await fetchAvgRemakeRate(buildCompareRangeParams(range, options?.departmentId));
      const rate = Number.isFinite(res.rate) ? res.rate : 0;
      const deltaRate = Number.isFinite(res.deltaRate) ? res.deltaRate : 0;
      const sign = deltaRate > 0 ? "+" : "";

      return {
        value: `${(rate * 100).toFixed(1)}%`,
        delta: `${sign}${(deltaRate * 100).toFixed(1)}%`,
        caption: "làm lại",
      };
    },
    [range, options?.departmentId],
    {
      key: buildScopedKey("dashboard:avg-remake-rate", options, range),
      invalidateEvent: "invalidate:dashboard:avg-remake-rate",
    },
  );
}

export function useDueToday(options?: DashboardQueryOptions) {
  return useAsync<DueTodayItem[]>(
    async () => fetchDueToday(options?.departmentId),
    [options?.departmentId],
    {
      key: buildScopedKey("dashboard:due-today", options),
      invalidateEvent: "invalidate:dashboard:due-today",
    },
  );
}

export function useActiveToday(options?: DashboardQueryOptions) {
  return useAsync<ActiveTodayItem[]>(
    async () => fetchActiveToday(options?.departmentId),
    [options?.departmentId],
    {
      key: buildScopedKey("dashboard:active-today", options),
      invalidateEvent: "invalidate:dashboard:active-today",
    },
  );
}

export function useCaseStatuses(options?: DashboardQueryOptions) {
  return useAsync<CaseStatusItemModel[]>(
    async () => fetchCaseStatuses(options?.departmentId),
    [options?.departmentId],
    {
      key: buildScopedKey("dashboard:case-statuses", options),
      invalidateEvent: "invalidate:dashboard:case-statuses",
    },
  );
}

export function useProductionPlanningOverview(options?: DashboardQueryOptions) {
  return useAsync<ProductionPlanningOverview>(
    async () => fetchProductionPlanningOverview(options?.departmentId),
    [options?.departmentId],
    {
      key: buildScopedKey("dashboard:production-planning", options),
      invalidateEvent: "invalidate:dashboard:production-planning",
    },
  );
}

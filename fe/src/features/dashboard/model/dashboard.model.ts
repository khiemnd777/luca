import type { LinearProgressProps } from "@mui/material";

export interface DashboardCompareParams {
  departmentId?: number | null;
  fromDate: string;
  toDate: string;
  previousFromDate: string;
  previousToDate: string;
}

export interface DashboardCompareParamsDto {
  department_id?: number | null;
  from_date: string;
  to_date: string;
  previous_from_date: string;
  previous_to_date: string;
}

export interface AvgTurnaroundResult {
  avgDays: number;
  deltaDays: number;
}

export interface AvgTurnaroundResultDto {
  avg_days?: number;
  delta_days?: number;
}

export interface AvgRemakeRateResult {
  rate: number;
  deltaRate: number;
}

export interface AvgRemakeRateResultDto {
  rate?: number;
  delta_rate?: number;
}

export interface CasesMetricResult {
  value: number;
  delta: number;
}

export interface CasesMetricResultDto {
  value?: number;
  delta?: number;
}

export interface DueTodayItem {
  id: number;
  code: string;
  dentist: string;
  patient: string;
  deliveryAt: string;
  ageDays: number;
  dueType: string;
  priority: string;
  status?: string;
  deliveryStatus?: string;
}

export interface DueTodayItemDto {
  id: number;
  code?: string;
  dentist?: string;
  patient?: string;
  delivery_at?: string;
  age_days?: number;
  due_type?: string;
  priority?: string;
  status?: string;
  delivery_status?: string;
}

export interface ActiveTodayItem {
  id: number;
  code: string;
  dentist: string;
  patient: string;
  deliveryAt: string;
  createdAt: string;
  ageDays: number;
  priority: string;
  status?: string;
}

export interface ActiveTodayItemDto {
  id: number;
  code?: string;
  dentist?: string;
  patient?: string;
  delivery_at?: string;
  created_at?: string;
  age_days?: number;
  priority?: string;
  status?: string;
}

export interface CaseStatusItemModel {
  status: string;
  label: string;
  count: number;
  target?: number;
  color?: LinearProgressProps["color"];
  helper?: string;
}

export interface CaseStatusItemDto {
  status?: string;
  label?: string;
  count?: number;
  target?: number;
  color?: string;
  helper?: string;
}

export interface SalesSummaryModel {
  totalRevenue: number;
  orderItemsCount: number;
  prevRevenue: number;
  growthPercent?: number | null;
}

export interface SalesSummaryDto {
  total_revenue?: number;
  order_items_count?: number;
  prev_revenue?: number;
  growth_percent?: number | null;
}

export interface SalesDailyItem {
  date: string;
  revenue: number;
}

export interface SalesDailyItemDto {
  date?: string;
  revenue?: number;
}

export interface SalesReportResult {
  summary: SalesSummaryModel;
  daily: SalesDailyItem[];
}

export interface SalesReportResultDto {
  summary?: SalesSummaryDto;
  daily?: SalesDailyItemDto[];
}

export type SalesReportRange = "today" | "7d" | "30d";

export interface SalesDailyParams {
  departmentId?: number | null;
  fromDate: string;
  toDate: string;
}

export interface SalesDailyParamsDto {
  department_id?: number | null;
  from_date: string;
  to_date: string;
}

export type PlanningRiskBucket =
  | "overdue"
  | "due_2h"
  | "due_4h"
  | "due_6h"
  | "predicted_late"
  | "normal";

export interface ProductionPlanningBusinessHours {
  startHour: number;
  endHour: number;
  workDays?: number[];
}

export interface ProductionPlanningBusinessHoursDto {
  start_hour?: number;
  end_hour?: number;
  work_days?: number[];
}

export interface ProductionPlanningConfig {
  departmentId?: number;
  enabled: boolean;
  configComplete: boolean;
  defaultDurationMin?: number;
  businessHours: ProductionPlanningBusinessHours;
  processDurations?: Record<string, number>;
  sectionCapacity?: Record<string, number>;
  staffCapacity?: Record<string, number>;
  disabledSections?: string[];
  disabledStaff?: string[];
}

export interface ProductionPlanningConfigDto {
  department_id?: number;
  enabled?: boolean;
  config_complete?: boolean;
  default_duration_min?: number;
  business_hours?: ProductionPlanningBusinessHoursDto;
  process_durations?: Record<string, number>;
  section_capacity?: Record<string, number>;
  staff_capacity?: Record<string, number>;
  disabled_sections?: string[];
  disabled_staff?: string[];
}

export interface ProductionPlanningSummary {
  overdue: number;
  due2h: number;
  due4h: number;
  due6h: number;
  predictedLate: number;
  recoverable: number;
  blocked: number;
}

export interface ProductionPlanningSummaryDto {
  overdue?: number;
  due_2h?: number;
  due_4h?: number;
  due_6h?: number;
  predicted_late?: number;
  recoverable?: number;
  blocked?: number;
}

export interface ProductionPlanningRecommendation {
  id: string;
  type: string;
  status: string;
  reason: string;
  orderId: number;
  orderItemId: number;
  inProgressId: number;
  assignedUserId?: number | null;
  assignedName?: string | null;
  targetUserId: number;
  targetName: string;
  expectedRiskDelta?: number;
}

export interface ProductionPlanningRecommendationDto {
  id?: string;
  type?: string;
  status?: string;
  reason?: string;
  order_id?: number;
  order_item_id?: number;
  in_progress_id?: number;
  assigned_user_id?: number | null;
  assigned_name?: string | null;
  target_user_id?: number;
  target_name?: string;
  expected_risk_delta?: number;
}

export interface ProductionPlanningRiskItem {
  orderId: number;
  orderItemId: number;
  inProgressId?: number;
  orderCode?: string | null;
  orderItemCode?: string | null;
  processName?: string | null;
  sectionName?: string | null;
  assignedUserId?: number | null;
  assignedName?: string | null;
  startedAt?: string | null;
  eta?: string | null;
  deliveryAt?: string | null;
  remainingMinutes?: number | null;
  lateByMinutes?: number | null;
  riskScore: number;
  riskBucket: PlanningRiskBucket;
  predictedLate: boolean;
  activeAgeMinutes?: number;
  remainingWorkMinutes?: number;
  recommendedAction?: ProductionPlanningRecommendation | null;
}

export interface ProductionPlanningRiskItemDto {
  order_id?: number;
  order_item_id?: number;
  in_progress_id?: number;
  order_code?: string | null;
  order_item_code?: string | null;
  process_name?: string | null;
  section_name?: string | null;
  assigned_user_id?: number | null;
  assigned_name?: string | null;
  started_at?: string | null;
  eta?: string | null;
  delivery_at?: string | null;
  remaining_minutes?: number | null;
  late_by_minutes?: number | null;
  risk_score?: number;
  risk_bucket?: PlanningRiskBucket;
  predicted_late?: boolean;
  active_age_minutes?: number;
  remaining_work_minutes?: number;
  recommended_action?: ProductionPlanningRecommendationDto | null;
}

export interface ProductionPlanningBottleneck {
  key: string;
  type: string;
  label: string;
  activeCount: number;
  overdueCount: number;
  predictedLateCount: number;
  loadMinutes: number;
  capacityMultiplier: number;
  nearestDeliveryAt?: string | null;
  topRiskScore: number;
}

export interface ProductionPlanningBottleneckDto {
  key?: string;
  type?: string;
  label?: string;
  active_count?: number;
  overdue_count?: number;
  predicted_late_count?: number;
  load_minutes?: number;
  capacity_multiplier?: number;
  nearest_delivery_at?: string | null;
  top_risk_score?: number;
}

export interface ProductionPlanningOverview {
  serverNow: string;
  config: ProductionPlanningConfig;
  summary: ProductionPlanningSummary;
  riskItems: ProductionPlanningRiskItem[];
  bottlenecks: ProductionPlanningBottleneck[];
  recommendations: ProductionPlanningRecommendation[];
}

export interface ProductionPlanningOverviewDto {
  server_now?: string;
  config?: ProductionPlanningConfigDto;
  summary?: ProductionPlanningSummaryDto;
  risk_items?: ProductionPlanningRiskItemDto[];
  bottlenecks?: ProductionPlanningBottleneckDto[];
  recommendations?: ProductionPlanningRecommendationDto[];
}

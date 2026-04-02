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

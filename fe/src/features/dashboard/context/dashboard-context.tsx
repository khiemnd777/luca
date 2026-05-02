/* eslint-disable react-refresh/only-export-components */
import React from "react";
import type { SalesReportRange } from "@features/dashboard/model/dashboard.model";

type DashboardContextValue = {
  departmentId?: number | null;
  range: SalesReportRange;
  setRange: (range: SalesReportRange) => void;
  cacheNamespace: string;
  showProductionPlanning: boolean;
};

const DashboardContext = React.createContext<DashboardContextValue | null>(null);

type DashboardProviderProps = React.PropsWithChildren<{
  departmentId?: number | null;
  cacheNamespace?: string;
  initialRange?: SalesReportRange;
  showProductionPlanning?: boolean;
}>;

export function DashboardProvider({
  children,
  departmentId,
  cacheNamespace = "home",
  initialRange = "7d",
  showProductionPlanning = true,
}: DashboardProviderProps) {
  const [range, setRange] = React.useState<SalesReportRange>(initialRange);

  const value = React.useMemo<DashboardContextValue>(
    () => ({
      departmentId,
      range,
      setRange,
      cacheNamespace,
      showProductionPlanning,
    }),
    [cacheNamespace, departmentId, range, showProductionPlanning],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboardContext must be used within DashboardProvider");
  }
  return context;
}

export function salesRangeLabel(range: SalesReportRange) {
  if (range === "today") return "hôm nay";
  if (range === "7d") return "trong 7 ngày";
  return "trong 30 ngày";
}

export function buildDashboardCacheNamespaceKey(resource: string, cacheNamespace = "home") {
  if (!cacheNamespace || cacheNamespace === "home") {
    return `dashboard:${resource}`;
  }

  return `dashboard:${cacheNamespace}:${resource}`;
}

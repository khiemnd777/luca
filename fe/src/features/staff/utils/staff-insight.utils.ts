import dayjs from "dayjs";
import type { OrderItemProcessModel } from "@features/order/model/order-item-process.model";
import type { StaffOverviewModel } from "@features/order/model/staff-overview.model";
import type { StaffModel } from "@features/staff/model/staff.model";

export type StaffInsightStatusKey = "waiting" | "in_progress" | "qc" | "rework" | "completed";

export type StaffInsightSectionLoad = {
  sectionName: string;
  staffCount: number;
  openProcesses: number;
};

export type StaffInsightPerformer = {
  staffId: number;
  name: string;
  openProcesses: number;
  recentCompletedProcesses: number;
  recentOrders: number;
  recentRevenue: number;
};

export type StaffInsightCoverage = {
  expectedStaffs: number;
  staffsWithOrderData: number;
  failedStaffs: number;
};

export type StaffInsightSummary = {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  assignedStaffCount: number;
  idleStaffCount: number;
  totalOpenProcesses: number;
  totalRecentCompletedProcesses: number;
  totalRecentOrders: number;
  totalRecentRevenue: number;
  avgOpenProcessesPerAssigned: number;
  engagementRate: number;
  backlogStatusCounts: Record<StaffInsightStatusKey, number>;
  sectionLoads: StaffInsightSectionLoad[];
  workforceSections: StaffInsightSectionLoad[];
  topPerformers: StaffInsightPerformer[];
  coverage: StaffInsightCoverage;
};

export type StaffInsightOrderSnapshot = {
  staffId: number;
  overview: StaffOverviewModel | null;
  processes: OrderItemProcessModel[];
  failed: boolean;
};

const RECENT_WINDOW_DAYS = 30;
const EMPTY_STATUS_COUNTS: Record<StaffInsightStatusKey, number> = {
  waiting: 0,
  in_progress: 0,
  qc: 0,
  rework: 0,
  completed: 0,
};

function resolveProcessStatus(item?: OrderItemProcessModel | null): StaffInsightStatusKey {
  const explicitStatus = typeof item?.customFields?.status === "string"
    ? String(item.customFields.status).toLowerCase()
    : "";

  if (explicitStatus === "completed") return "completed";
  if (explicitStatus === "qc") return "qc";
  if (explicitStatus === "rework") return "rework";
  if (explicitStatus === "in_progress") return "in_progress";
  if (item?.completedAt) return "completed";
  if (item?.startedAt) return "in_progress";
  return "waiting";
}

function createStatusCounts() {
  return { ...EMPTY_STATUS_COUNTS };
}

function createSectionBucket(sectionName: string): StaffInsightSectionLoad & { staffIds: Set<number> } {
  return {
    sectionName,
    staffCount: 0,
    openProcesses: 0,
    staffIds: new Set<number>(),
  };
}

function normalizeSectionName(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed || "Chưa gán bộ phận";
}

export function buildStaffInsightSummary(
  staffs: StaffModel[],
  snapshots: StaffInsightOrderSnapshot[],
): StaffInsightSummary {
  const workforceSectionMap = new Map<string, ReturnType<typeof createSectionBucket>>();
  const loadSectionMap = new Map<string, ReturnType<typeof createSectionBucket>>();
  const coverage: StaffInsightCoverage = {
    expectedStaffs: staffs.length,
    staffsWithOrderData: 0,
    failedStaffs: 0,
  };
  const backlogStatusCounts = createStatusCounts();
  const performers: StaffInsightPerformer[] = [];
  const activeStaff = staffs.filter((staff) => staff.active).length;
  const recentCutoff = dayjs().subtract(RECENT_WINDOW_DAYS, "day").startOf("day");

  for (const staff of staffs) {
    const sectionNames = staff.sectionNames?.length ? staff.sectionNames : ["Chưa gán bộ phận"];
    for (const rawSectionName of sectionNames) {
      const sectionName = normalizeSectionName(rawSectionName);
      const bucket = workforceSectionMap.get(sectionName) ?? createSectionBucket(sectionName);
      bucket.staffIds.add(staff.id);
      bucket.staffCount = bucket.staffIds.size;
      workforceSectionMap.set(sectionName, bucket);
    }
  }

  let assignedStaffCount = 0;
  let totalOpenProcesses = 0;
  let totalRecentCompletedProcesses = 0;
  let totalRecentOrders = 0;
  let totalRecentRevenue = 0;

  for (const snapshot of snapshots) {
    if (snapshot.failed) {
      coverage.failedStaffs += 1;
      continue;
    }

    coverage.staffsWithOrderData += 1;

    const openProcesses = snapshot.processes.filter((process) => {
      const status = resolveProcessStatus(process);
      return status !== "completed";
    });

    if (openProcesses.length > 0) {
      assignedStaffCount += 1;
    }

    totalOpenProcesses += openProcesses.length;
    totalRecentOrders += snapshot.overview?.summary?.recentOrderCount ?? 0;
    totalRecentRevenue += snapshot.overview?.summary?.recentRevenue ?? 0;

    const recentCompletedProcesses = snapshot.processes.filter((process) => {
      if (!process.completedAt) return false;
      return dayjs(process.completedAt).isAfter(recentCutoff) || dayjs(process.completedAt).isSame(recentCutoff);
    }).length;

    totalRecentCompletedProcesses += recentCompletedProcesses;

    for (const process of openProcesses) {
      const status = resolveProcessStatus(process);
      backlogStatusCounts[status] += 1;

      const sectionName = normalizeSectionName(process.sectionName);
      const bucket = loadSectionMap.get(sectionName) ?? createSectionBucket(sectionName);
      bucket.staffIds.add(snapshot.staffId);
      bucket.staffCount = bucket.staffIds.size;
      bucket.openProcesses += 1;
      loadSectionMap.set(sectionName, bucket);
    }

    performers.push({
      staffId: snapshot.staffId,
      name: staffs.find((staff) => staff.id === snapshot.staffId)?.name ?? `#${snapshot.staffId}`,
      openProcesses: openProcesses.length,
      recentCompletedProcesses,
      recentOrders: snapshot.overview?.summary?.recentOrderCount ?? 0,
      recentRevenue: snapshot.overview?.summary?.recentRevenue ?? 0,
    });
  }

  const totalStaff = staffs.length;
  const inactiveStaff = Math.max(0, totalStaff - activeStaff);
  const idleStaffCount = Math.max(0, totalStaff - assignedStaffCount);
  const avgOpenProcessesPerAssigned = assignedStaffCount > 0
    ? totalOpenProcesses / assignedStaffCount
    : 0;
  const engagementRate = activeStaff > 0
    ? (assignedStaffCount / activeStaff) * 100
    : 0;

  return {
    totalStaff,
    activeStaff,
    inactiveStaff,
    assignedStaffCount,
    idleStaffCount,
    totalOpenProcesses,
    totalRecentCompletedProcesses,
    totalRecentOrders,
    totalRecentRevenue,
    avgOpenProcessesPerAssigned,
    engagementRate,
    backlogStatusCounts,
    sectionLoads: Array.from(loadSectionMap.values())
      .sort((a, b) => b.openProcesses - a.openProcesses || b.staffCount - a.staffCount || a.sectionName.localeCompare(b.sectionName))
      .map(({ staffIds: _staffIds, ...item }) => item),
    workforceSections: Array.from(workforceSectionMap.values())
      .sort((a, b) => b.staffCount - a.staffCount || a.sectionName.localeCompare(b.sectionName))
      .map(({ staffIds: _staffIds, ...item }) => item),
    topPerformers: performers
      .sort((a, b) =>
        b.recentCompletedProcesses - a.recentCompletedProcesses
        || b.recentOrders - a.recentOrders
        || b.recentRevenue - a.recentRevenue
        || b.openProcesses - a.openProcesses
        || a.name.localeCompare(b.name))
      .slice(0, 5),
    coverage,
  };
}

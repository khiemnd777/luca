import React from "react";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import { registerSlot } from "@core/module/registry";
import { IfPermission } from "@core/auth/if-permission";
import type { AutoFormRef } from "@core/form/form.types";
import { AutoForm } from "@core/form/auto-form";
import { useAsync } from "@core/hooks/use-async";
import { useParams } from "react-router-dom";
import { SafeButton } from "@shared/components/button/safe-button";
import { SectionCard } from "@shared/components/ui/section-card";
import { getById } from "@features/department/api/department.api";
import { DepartmentSyncReviewDialog } from "@features/department/components/department-sync-review.dialog";
import { TabContainer, type TabItem } from "@shared/components/ui/tab-container";
import { AutoTable } from "@core/table/auto-table";
import { openFormDialog } from "@core/form/form-dialog.service";
import { subscribeTableReload } from "@core/table/table-reload";
import { useAuthStore } from "@store/auth-store";
import { createDepartmentDetailStaffTableSchema } from "@features/staff/tables/department-detail-staff.table";
import { DashboardOverview } from "@features/dashboard/components/dashboard-overview";
import { DashboardProvider } from "@features/dashboard/context/dashboard-context";

const DEPARTMENT_DETAIL_STAFFS_TABLE = "department-detail-staffs";

export function DeparmentDetailWidget() {
  const { departmentId } = useParams();
  const formRef = React.useRef<AutoFormRef>(null);
  const [syncOpen, setSyncOpen] = React.useState(false);
  const [formVersion, setFormVersion] = React.useState(0);
  const resolvedDepartmentId = Number(departmentId ?? 0);
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));
  const canViewStaff = useAuthStore((state) => state.hasPermission("staff.view"));
  const { data: detail, reload } = useAsync(async () => {
    if (!resolvedDepartmentId) return null;
    return await getById(resolvedDepartmentId);
  }, [resolvedDepartmentId]);
  const staffTableSchema = React.useMemo(
    () => createDepartmentDetailStaffTableSchema(resolvedDepartmentId, detail?.corporateAdministratorId),
    [detail?.corporateAdministratorId, resolvedDepartmentId]
  );

  React.useEffect(() => {
    if (!resolvedDepartmentId) return;
    return subscribeTableReload(DEPARTMENT_DETAIL_STAFFS_TABLE, () => {
      void reload();
    });
  }, [reload, resolvedDepartmentId]);

  const tabs: TabItem[] = [
    ...(canViewOrder ? [{
      label: "Tổng quan",
      icon: <AssessmentOutlinedIcon />,
      value: "overview",
      content: (
        <DashboardProvider
          departmentId={resolvedDepartmentId}
          cacheNamespace={`department-${resolvedDepartmentId || "unknown"}`}
        >
          <DashboardOverview />
        </DashboardProvider>
      ),
    }] : []),
    {
      label: "Thông tin chi tiết",
      icon: <InfoOutlinedIcon />,
      value: "info",
      content: (
        <SectionCard
          title="Chi nhánh"
          extra={
            <>
              <IfPermission permissions={["department.update"]}>
                {detail?.parentId ? (
                  <SafeButton
                    variant="outlined"
                    startIcon={<SyncAltOutlinedIcon />}
                    onClick={() => setSyncOpen(true)}
                  >
                    Sync từ chi nhánh cha
                  </SafeButton>
                ) : null}
              </IfPermission>
              <IfPermission permissions={["department.update"]}>
                <SafeButton
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={() => formRef.current?.submit()}
                >
                  Lưu
                </SafeButton>
              </IfPermission>
            </>
          }
        >
          <AutoForm
            key={`${resolvedDepartmentId}-${formVersion}`}
            name="department"
            ref={formRef}
            initial={{ id: departmentId }}
          />
        </SectionCard>
      ),
    },
  ];

  if (canViewStaff) {
    tabs.push({
      label: "Danh sách Nhân viên",
      icon: <BadgeOutlinedIcon />,
      value: "staffs",
      content: (
        <SectionCard
          title="Danh sách Nhân viên"
          extra={
            <IfPermission permissions={["staff.create"]}>
              <SafeButton
                variant="outlined"
                onClick={() => {
                  openFormDialog("department-staff-create", {
                    initial: { departmentId: resolvedDepartmentId },
                    onSaved: async () => {
                      reload();
                    },
                  });
                }}
              >
                Thêm nhân sự
              </SafeButton>
            </IfPermission>
          }
        >
          <AutoTable
            key={resolvedDepartmentId}
            schema={staffTableSchema}
            params={{ departmentId: resolvedDepartmentId }}
          />
        </SectionCard>
      ),
    });
  }

  return (
    <>
      <TabContainer tabs={tabs} defaultValue={canViewOrder ? "overview" : "info"} />
      <DepartmentSyncReviewDialog
        open={syncOpen}
        departmentId={resolvedDepartmentId || undefined}
        departmentName={detail?.name}
        onClose={() => setSyncOpen(false)}
        onApplied={async () => {
          await reload();
          setFormVersion((prev) => prev + 1);
        }}
      />
    </>
  );
}

registerSlot({
  id: "department-detail",
  name: "department-detail:left",
  render: () => <DeparmentDetailWidget />,
});

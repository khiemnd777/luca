import React from "react";
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

function DeparmentDetailWidget() {
  const { departmentId } = useParams();
  const formRef = React.useRef<AutoFormRef>(null);
  const [syncOpen, setSyncOpen] = React.useState(false);
  const [formVersion, setFormVersion] = React.useState(0);
  const resolvedDepartmentId = Number(departmentId ?? 0);
  const { data: detail, reload } = useAsync(async () => {
    if (!resolvedDepartmentId) return null;
    return await getById(resolvedDepartmentId);
  }, [resolvedDepartmentId]);

  return (
    <>
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

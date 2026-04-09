/* eslint-disable react-refresh/only-export-components */
import AddIcon from "@mui/icons-material/Add";
import { Button } from "@mui/material";
import { openFormDialog } from "@core/form/form-dialog.service";
import { IfPermission } from "@core/auth/if-permission";
import { registerSlot } from "@core/module/registry";
import { DepartmentDashboardDialog } from "@features/dashboard/components/department-dashboard-dialog";
import { useDepartmentDashboardDialogStore } from "@features/department/model/department-dashboard-dialog.store";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { AutoTable } from "@core/table/auto-table";
import { Stack } from "@mui/material";

function DeparmentWidget() {
  const deptId = 1;
  const { open, departmentId, departmentName, closeDialog } = useDepartmentDashboardDialogStore();

  return (
    <>
      <SectionCard
        title="Chi nhánh"
        extra={
          <Stack direction="row" spacing={1}>
            <IfPermission permissions={["department.create"]}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => openFormDialog("department", { initial: { parentId: deptId } })}
              >
                Thêm chi nhánh
              </Button>
            </IfPermission>
          </Stack>
        }
      >
        <AutoTable name="department-children" params={{ deptId }} />
      </SectionCard>

      <DepartmentDashboardDialog
        open={open}
        departmentId={departmentId}
        departmentName={departmentName}
        onClose={closeDialog}
      />
    </>
  );
}

registerSlot({
  id: "department",
  name: "department:left",
  render: () => <DeparmentWidget />,
});

import AddIcon from "@mui/icons-material/Add";
import { Button } from "@mui/material";
import { openFormDialog } from "@core/form/form-dialog.service";
import { IfPermission } from "@core/auth/if-permission";
import { registerSlot } from "@core/module/registry";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { AutoTable } from "@core/table/auto-table";
import { Stack } from "@mui/material";

function DeparmentWidget() {
  const deptId = 1;

  return (
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
  );
}

registerSlot({
  id: "department",
  name: "department:left",
  render: () => <DeparmentWidget />,
});

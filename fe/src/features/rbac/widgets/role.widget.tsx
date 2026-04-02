import { SectionCard } from "@root/shared/components/ui/section-card";
import { AutoTable } from "@root/core/table/auto-table";
import { Button } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@root/core/form/form-dialog.service";
import { registerSlot } from "@root/core/module/registry";

function RoleWidget() {
  return (
    <>
      <SectionCard title={"Vai trò"} extra={
        <>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
            openFormDialog("role");
          }} >Thêm vai trò</Button>
        </>
      }>
        <AutoTable name="roles" />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "role",
  name: "rbac:left",
  priority: 2,
  render: () => RoleWidget(),
});
import { SectionCard } from "@root/shared/components/ui/section-card";
import { registerSlot } from "@core/module/registry";
import { AutoTable } from "@core/table/auto-table";
import { IfPermission } from "@core/auth/if-permission";
import { Button } from "@mui/material";
import { openFormDialog } from "@core/form/form-dialog.service";
import AddIcon from '@mui/icons-material/Add';

function ImportProfilesWidget() {
  return (
    <>
      <SectionCard extra={
        <>
          <IfPermission permissions={["privilege.metadata"]}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
              openFormDialog("import-profile");
            }} >New imported profile</Button>
          </IfPermission>
        </>
      }>
        <AutoTable name="import-profiles" />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "import-profiles",
  name: "import-profiles:left",
  render: () => <ImportProfilesWidget />,
})

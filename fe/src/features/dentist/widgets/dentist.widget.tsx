import { Button } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";

function DentistWidget() {
  return (
    <>
      <SectionCard extra={
        <>
          <IfPermission permissions={["clinic.create"]}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
              openFormDialog("dentist");
            }} >Thêm nha sĩ</Button>
          </IfPermission>
        </>
      }>
        <AutoTable name="dentists" />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "dentist",
  name: "dentist:left",
  render: () => <DentistWidget />,
})

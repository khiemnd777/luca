import { Button } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";

function SampleWidget() {
  return (
    <>
      <SectionCard extra={
        <>
          <IfPermission permissions={["supplier.create"]}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
              openFormDialog("supplier");
            }} >Thêm Nhà cung cấp</Button>
          </IfPermission>
        </>
      }>
        <AutoTable name="suppliers" />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "supplier",
  name: "supplier:left",
  render: () => <SampleWidget />,
})

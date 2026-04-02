import { Button } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";

function CustomerWidget() {
  return (
    <>
      <SectionCard extra={
        <>
          <IfPermission permissions={["customer.create"]}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
              openFormDialog("customer");
            }} >Thêm Khách hàng</Button>
          </IfPermission>
        </>
      }>
        <AutoTable name="customers" />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "customer",
  name: "customer:left",
  render: () => <CustomerWidget />,
})

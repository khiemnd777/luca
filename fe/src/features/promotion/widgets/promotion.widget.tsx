import { Button } from "@mui/material";
import { IfPermission } from "@root/core/auth/if-permission";
import { openFormDialog } from "@root/core/form/form-dialog.service";
import { registerSlot } from "@root/core/module/registry";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { AutoTable } from "@root/core/table/auto-table";

registerSlot({
  id: "promotion",
  name: "promotion:left",
  render: () => (
    <>
      <SectionCard title="Khuyến mãi" extra={
        <>
          <IfPermission permissions={["promotion.create"]}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
              openFormDialog("promotion");
            }} >Tạo khuyến mãi</Button>
          </IfPermission>
        </>
      }>
        <AutoTable name="promotions" />
      </SectionCard>
    </>
  ),
});
import { Button } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer } from "@root/shared/components/ui/tab-container";

function MaterialWidget() {
  return (
    <>
      <TabContainer
        tabs={[
          {
            label: "Vật tư",
            value: "materials",
            content: (
              <SectionCard
                extra={
                  <>
                    <IfPermission permissions={["material.create"]}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          openFormDialog("material");
                        }}
                      >
                        Thêm Vật tư
                      </Button>
                    </IfPermission>
                  </>
                }
              >
                <AutoTable name="materials" />
              </SectionCard>
            ),
          },
          {
            label: "Vật tư đang mượn",
            value: "order-loaner-materials-on-loan",
            content: (
              <SectionCard>
                <AutoTable name="order-loaner-materials-on-loan" />
              </SectionCard>
            ),
          },
        ]}
      />
    </>
  );
}

registerSlot({
  id: "material",
  name: "material:left",
  render: () => <MaterialWidget />,
})

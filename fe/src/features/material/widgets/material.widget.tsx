import { Button } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer } from "@root/shared/components/ui/tab-container";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { MaterialInsightWidget } from "@features/material/widgets/material-insight.widget";

function MaterialWidget() {
  return (
    <>
      <TabContainer
        defaultValue="insight"
        tabSx={{ mb: 2, borderBottom: 0 }}
        contentSx={{ mt: 0 }}
        tabs={[
          {
            label: "Insight",
            icon: <InsightsOutlinedIcon />,
            value: "insight",
            content: <MaterialInsightWidget />,
          },
          {
            label: "Vật tư",
            icon: <CategoryOutlinedIcon />,
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
            icon: <Inventory2OutlinedIcon />,
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

import { Button } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer } from "@root/shared/components/ui/tab-container";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ContactEmergencyOutlinedIcon from "@mui/icons-material/ContactEmergencyOutlined";
import { DentistInsightWidget } from "@features/dentist/widgets/dentist-insight.widget";
import { useAuthStore } from "@store/auth-store";

function DentistWidget() {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  return (
    <TabContainer
      defaultValue={canViewOrder ? "overview" : "dentists"}
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={[
        ...(canViewOrder ? [{
          label: "Tổng quan",
          icon: <InsightsOutlinedIcon />,
          value: "overview",
          content: <DentistInsightWidget />,
        }] : []),
        {
          label: "Danh sách Nha Sĩ",
          icon: <ContactEmergencyOutlinedIcon />,
          value: "dentists",
          content: (
            <SectionCard extra={(
              <IfPermission permissions={["clinic.create"]}>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                  openFormDialog("dentist");
                }} >Thêm nha sĩ</Button>
              </IfPermission>
            )}>
              <AutoTable name="dentists" />
            </SectionCard>
          ),
        },
      ]}
    />
  );
}

registerSlot({
  id: "dentist",
  name: "dentist:left",
  render: () => <DentistWidget />,
})

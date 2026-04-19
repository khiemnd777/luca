import { Button } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer } from "@root/shared/components/ui/tab-container";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import AccessibleOutlinedIcon from "@mui/icons-material/AccessibleOutlined";
import { PatientInsightWidget } from "@features/patient/widgets/patient-insight.widget";
import { useAuthStore } from "@store/auth-store";

function PatientWidget() {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  return (
    <TabContainer
      defaultValue={canViewOrder ? "overview" : "patients"}
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={[
        ...(canViewOrder ? [{
          label: "Tổng quan",
          icon: <InsightsOutlinedIcon />,
          value: "overview",
          content: <PatientInsightWidget />,
        }] : []),
        {
          label: "Danh sách Bệnh Nhân",
          icon: <AccessibleOutlinedIcon />,
          value: "patients",
          content: (
            <SectionCard extra={(
              <IfPermission permissions={["clinic.create"]}>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                  openFormDialog("patient");
                }} >Thêm bệnh nhân</Button>
              </IfPermission>
            )}>
              <AutoTable name="patients" />
            </SectionCard>
          ),
        },
      ]}
    />
  );
}

registerSlot({
  id: "patient",
  name: "patient:left",
  render: () => <PatientWidget />,
})

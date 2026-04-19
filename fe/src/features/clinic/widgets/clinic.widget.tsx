import { Button } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer } from "@root/shared/components/ui/tab-container";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LocalHospitalOutlinedIcon from "@mui/icons-material/LocalHospitalOutlined";
import { ClinicInsightWidget } from "@features/clinic/widgets/clinic-insight.widget";
import { useAuthStore } from "@store/auth-store";

function ClinicWidget() {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  return (
    <TabContainer
      defaultValue={canViewOrder ? "overview" : "clinics"}
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={[
        ...(canViewOrder ? [{
          label: "Tổng quan",
          icon: <InsightsOutlinedIcon />,
          value: "overview",
          content: <ClinicInsightWidget />,
        }] : []),
        {
          label: "Danh sách Nha Khoa",
          icon: <LocalHospitalOutlinedIcon />,
          value: "clinics",
          content: (
            <SectionCard extra={
              <IfPermission permissions={["clinic.create"]}>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                  openFormDialog("clinic");
                }} >Thêm nha khoa</Button>
              </IfPermission>
            }>
              <AutoTable name="clinics" />
            </SectionCard>
          ),
        },
      ]}
    />
  );
}

registerSlot({
  id: "clinic",
  name: "clinic:left",
  render: () => <ClinicWidget />,
})

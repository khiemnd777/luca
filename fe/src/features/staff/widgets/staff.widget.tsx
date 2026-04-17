import { Button, Typography } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer } from "@root/shared/components/ui/tab-container";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import { StaffInsightWidget } from "@features/staff/widgets/staff-insight.widget";
import { useAuthStore } from "@store/auth-store";

function StaffWidget() {
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  return (
    <TabContainer
      defaultValue={canViewOrder ? "overview" : "staffs"}
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={[
        {
          label: "Tổng quan",
          icon: <DashboardOutlinedIcon />,
          value: "overview",
          content: canViewOrder ? (
            <StaffInsightWidget />
          ) : (
            <SectionCard>
              <Typography variant="body2" color="text.secondary">
                Cần quyền xem đơn hàng để hiển thị tổng quan vận hành nhân sự.
              </Typography>
            </SectionCard>
          ),
        },
        {
          label: "Nhân sự",
          icon: <BadgeOutlinedIcon />,
          value: "staffs",
          content: (
            <SectionCard extra={
              <>
                <IfPermission permissions={["staff.create"]}>
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                    openFormDialog("staff-create");
                  }} >Thêm nhân sự</Button>
                </IfPermission>
              </>
            }>
              <AutoTable name="staffs" />
            </SectionCard>
          ),
        },
      ]}
    />
  );
}

registerSlot({
  id: "staff",
  name: "staff:left",
  render: () => <StaffWidget />,
})

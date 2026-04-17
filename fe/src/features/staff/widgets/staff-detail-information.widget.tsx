import React from "react";
import { SectionCard } from "@root/shared/components/ui/section-card";
import type { AutoFormRef } from "@root/core/form/form.types";
import { AutoForm } from "@root/core/form/auto-form";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { SafeButton } from "@shared/components/button/safe-button";
import { registerSlot } from "@root/core/module/registry";
import { useParams } from "react-router-dom";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer, type TabItem } from "@shared/components/ui/tab-container";
import { AutoTable } from "@core/table/auto-table";
import { SlotHost } from "@root/core/module/slot-host";
import { Spacer } from "@root/shared/components/ui/spacer";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import { useAuthStore } from "@store/auth-store";

function StaffDetailInformationWidget() {
  const { staffId } = useParams();
  const formStaffInformationRef = React.useRef<AutoFormRef>(null);
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  const tabs: TabItem[] = [
    ...(canViewOrder ? [{
      label: "Tổng quan",
      icon: <InsightsOutlinedIcon />,
      value: "overview",
      content: (
        <>
          <SlotHost name="staff-detail:overview" />
          <IfPermission permissions={["order.development"]}>
            <Spacer />
            <SlotHost name="staff-detail:inprogress" />
            <Spacer />
            <SectionCard title="Danh sách công đoạn đã thực hiện">
              <AutoTable name="staff-order-inprogress" params={{ staffId }} />
            </SectionCard>
          </IfPermission>
        </>
      ),
    }] : []),
    {
      label: "Thông tin nhân sự",
      icon: <ManageAccountsOutlinedIcon />,
      value: "info",
      content: (
        <SectionCard title={"Thông tin nhân sự"} extra={
          <IfPermission permissions={["staff.update"]}>
            <SafeButton variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => formStaffInformationRef.current?.submit()}>
              Lưu
            </SafeButton>
          </IfPermission>
        }>
          <AutoForm name="staff-detail" ref={formStaffInformationRef} initial={{ id: staffId }} />
        </SectionCard>
      ),
    },
  ];

  return (
    <TabContainer
      key={staffId ?? "staff-detail"}
      defaultValue={canViewOrder ? "overview" : "info"}
      tabs={tabs}
    />
  );
}

registerSlot({
  id: "staff-detail-information",
  name: "staff-detail:left",
  priority: 2,
  render: () => <StaffDetailInformationWidget />,
});

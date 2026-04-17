import React from "react";
import { SectionCard } from "@root/shared/components/ui/section-card";
import type { AutoFormRef } from "@root/core/form/form.types";
import { AutoForm } from "@root/core/form/auto-form";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { SafeButton } from "@shared/components/button/safe-button";
import { registerSlot } from "@root/core/module/registry";
import { useParams } from "react-router-dom";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer, type TabItem } from "@shared/components/ui/tab-container";
import { AutoTable } from "@core/table/auto-table";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useAuthStore } from "@store/auth-store";
import { SectionDetailOverview } from "@features/section/components/section-detail-overview.component";

function SectionDetailWidget() {
  const { sectionId } = useParams();
  const formSectionRef = React.useRef<AutoFormRef>(null);
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  const tabs: TabItem[] = [
    ...(canViewOrder ? [{
      label: "Tổng quan",
      icon: <InsightsOutlinedIcon />,
      value: "overview",
      content: <SectionDetailOverview sectionId={Number(sectionId ?? 0)} />,
    }] : []),
    {
      label: "Phòng ban",
      icon: <ApartmentOutlinedIcon />,
      value: "section",
      content: (
        <SectionCard title="Phòng ban" extra={
          <IfPermission permissions={["staff.update"]}>
            <SafeButton
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              onClick={() => formSectionRef.current?.submit()}
            >
              Lưu
            </SafeButton>
          </IfPermission>
        }>
          <AutoForm name="section" ref={formSectionRef} initial={{ id: sectionId }} />
        </SectionCard>
      ),
    },
    {
      label: "Đơn hàng",
      icon: <Inventory2OutlinedIcon />,
      value: "orders",
      content: <AutoTable name="section-orders" params={{ sectionId }} />,
    },
  ];

  return (
    <TabContainer
      key={sectionId ?? "section-detail"}
      defaultValue={canViewOrder ? "overview" : "section"}
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={tabs}
    />
  );
}

registerSlot({
  id: "section-detail",
  name: "section-detail:left",
  render: () => <SectionDetailWidget />,
});

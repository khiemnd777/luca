import React from "react";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ContactEmergencyOutlinedIcon from "@mui/icons-material/ContactEmergencyOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { registerSlot } from "@root/core/module/registry";
import { useParams } from "react-router-dom";
import { IfPermission } from "@root/core/auth/if-permission";
import { TabContainer, type TabItem } from "@shared/components/ui/tab-container";
import { SectionCard } from "@root/shared/components/ui/section-card";
import type { AutoFormRef } from "@root/core/form/form.types";
import { AutoForm } from "@root/core/form/auto-form";
import { SafeButton } from "@shared/components/button/safe-button";
import { AutoTable } from "@core/table/auto-table";
import { useAuthStore } from "@store/auth-store";
import { DentistDetailOverview } from "@features/dentist/components/dentist-detail-overview.component";

function DentistDetailWidget() {
  const { dentistId } = useParams();
  const formRef = React.useRef<AutoFormRef>(null);
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));
  const resolvedDentistId = Number(dentistId ?? 0);

  const tabs: TabItem[] = [
    ...(canViewOrder ? [{
      label: "Tổng quan",
      icon: <InsightsOutlinedIcon />,
      value: "overview",
      content: <DentistDetailOverview dentistId={resolvedDentistId} />,
    }] : []),
    {
      label: "Nha sĩ",
      icon: <ContactEmergencyOutlinedIcon />,
      value: "dentist",
      content: (
        <SectionCard
          title="Thông tin nha sĩ"
          extra={(
            <IfPermission permissions={["clinic.update"]}>
              <SafeButton
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={() => formRef.current?.submit()}
              >
                Lưu
              </SafeButton>
            </IfPermission>
          )}
        >
          <AutoForm name="dentist" ref={formRef} initial={{ id: resolvedDentistId }} />
        </SectionCard>
      ),
    },
    ...(canViewOrder ? [{
      label: "Đơn hàng",
      icon: <Inventory2OutlinedIcon />,
      value: "orders",
      content: <AutoTable name="dentist-orders" params={{ dentistId: resolvedDentistId }} />,
    }] : []),
  ];

  return (
    <TabContainer
      key={dentistId ?? "dentist-detail"}
      defaultValue={canViewOrder ? "overview" : "dentist"}
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={tabs}
    />
  );
}

registerSlot({
  id: "dentist-detail",
  name: "dentist-detail:left",
  render: () => <DentistDetailWidget />,
});

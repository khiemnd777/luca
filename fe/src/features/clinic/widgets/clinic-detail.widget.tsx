import React from "react";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LocalHospitalOutlinedIcon from "@mui/icons-material/LocalHospitalOutlined";
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
import { ClinicDetailOverview } from "@features/clinic/components/clinic-detail-overview.component";

function ClinicDetailWidget() {
  const { clinicId } = useParams();
  const formRef = React.useRef<AutoFormRef>(null);
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));

  const tabs: TabItem[] = [
    ...(canViewOrder ? [{
      label: "Tổng quan",
      icon: <InsightsOutlinedIcon />,
      value: "overview",
      content: <ClinicDetailOverview clinicId={Number(clinicId ?? 0)} />,
    }] : []),
    {
      label: "Nha khoa",
      icon: <LocalHospitalOutlinedIcon />,
      value: "clinic",
      content: (
        <SectionCard
          title="Thông tin nha khoa"
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
          <AutoForm name="clinic" ref={formRef} initial={{ id: clinicId }} />
        </SectionCard>
      ),
    },
    ...(canViewOrder ? [{
      label: "Đơn hàng",
      icon: <Inventory2OutlinedIcon />,
      value: "orders",
      content: <AutoTable name="clinic-orders" params={{ clinicId }} />,
    }] : []),
  ];

  return (
    <TabContainer
      key={clinicId ?? "clinic-detail"}
      defaultValue={canViewOrder ? "overview" : "clinic"}
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={tabs}
    />
  );
}

registerSlot({
  id: "clinic-detail",
  name: "clinic-detail:left",
  render: () => <ClinicDetailWidget />,
});

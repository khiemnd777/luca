import React from "react";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import AccessibleOutlinedIcon from "@mui/icons-material/AccessibleOutlined";
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
import { PatientDetailOverview } from "@features/patient/components/patient-detail-overview.component";

function PatientDetailWidget() {
  const { patientId } = useParams();
  const formRef = React.useRef<AutoFormRef>(null);
  const canViewOrder = useAuthStore((state) => state.hasPermission("order.view"));
  const resolvedPatientId = Number(patientId ?? 0);

  const tabs: TabItem[] = [
    ...(canViewOrder ? [{
      label: "Tổng quan",
      icon: <InsightsOutlinedIcon />,
      value: "overview",
      content: <PatientDetailOverview patientId={resolvedPatientId} />,
    }] : []),
    {
      label: "Bệnh nhân",
      icon: <AccessibleOutlinedIcon />,
      value: "patient",
      content: (
        <SectionCard
          title="Thông tin bệnh nhân"
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
          <AutoForm name="patient" ref={formRef} initial={{ id: resolvedPatientId }} />
        </SectionCard>
      ),
    },
    ...(canViewOrder ? [{
      label: "Đơn hàng",
      icon: <Inventory2OutlinedIcon />,
      value: "orders",
      content: <AutoTable name="patient-orders" params={{ patientId: resolvedPatientId }} />,
    }] : []),
  ];

  return (
    <TabContainer
      key={patientId ?? "patient-detail"}
      defaultValue={canViewOrder ? "overview" : "patient"}
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={tabs}
    />
  );
}

registerSlot({
  id: "patient-detail",
  name: "patient-detail:left",
  render: () => <PatientDetailWidget />,
});

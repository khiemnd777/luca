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

function SectionDetailWidget() {
  const { sectionId } = useParams();
  const formSectionRef = React.useRef<AutoFormRef>(null);

  return (
    <TabContainer
      key={sectionId ?? "section-detail"}
      tabs={[
        {
          label: "Phòng ban",
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
          value: "orders",
          content: <AutoTable name="section-orders" params={{ sectionId }} />,
        },
      ] satisfies TabItem[]}
    />
  );
}

registerSlot({
  id: "section-detail",
  name: "section-detail:left",
  render: () => <SectionDetailWidget />,
});

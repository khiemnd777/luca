import React from "react";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { registerSlot } from "@core/module/registry";
import { IfPermission } from "@core/auth/if-permission";
import type { AutoFormRef } from "@core/form/form.types";
import { AutoForm } from "@core/form/auto-form";
import { useParams } from "react-router-dom";
import { SafeButton } from "@shared/components/button/safe-button";
import { SectionCard } from "@shared/components/ui/section-card";

function DeparmentDetailWidget() {
  const { departmentId } = useParams();
  const formRef = React.useRef<AutoFormRef>(null);

  return (
    <SectionCard
      title="Chi nhánh"
      extra={
        <IfPermission permissions={["department.update"]}>
          <SafeButton
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            onClick={() => formRef.current?.submit()}
          >
            Lưu
          </SafeButton>
        </IfPermission>
      }
    >
      <AutoForm name="department" ref={formRef} initial={{ id: departmentId }} />
    </SectionCard>
  );
}

registerSlot({
  id: "department-detail",
  name: "department-detail:left",
  render: () => <DeparmentDetailWidget />,
});


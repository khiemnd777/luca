import React from "react";
import { SectionCard } from "@root/shared/components/ui/section-card";
import type { AutoFormRef } from "@root/core/form/form.types";
import { AutoForm } from "@root/core/form/auto-form";
import { SafeButton } from "@shared/components/button/safe-button";
import { registerSlot } from "@root/core/module/registry";
import ChangeCircleOutlinedIcon from '@mui/icons-material/ChangeCircleOutlined';
import { Spacer } from "@root/shared/components/ui/spacer";

function ChangePasswordWidget() {
  const formAccountChangePasswordRef = React.useRef<AutoFormRef>(null);
  return (
    <>
      <SectionCard title={"Đổi mật khẩu"} extra={
        <SafeButton variant="contained" startIcon={<ChangeCircleOutlinedIcon />} onClick={() => formAccountChangePasswordRef.current?.submit()}>
          Đổi
        </SafeButton>
      }>
        <AutoForm name="account-change-password" ref={formAccountChangePasswordRef} />
      </SectionCard>
      <Spacer />
    </>
  );
}

registerSlot({
  id: "change-password",
  name: "auth:right",
  priority: 1,
  render: () => <ChangePasswordWidget />,
});

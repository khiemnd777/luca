import React from "react";
import { SectionCard } from "@root/shared/components/ui/section-card";
import type { AutoFormRef } from "@root/core/form/form.types";
import { AutoForm } from "@root/core/form/auto-form";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { SafeButton } from "@shared/components/button/safe-button";
import { registerSlot } from "@root/core/module/registry";

function AccountWidget() {
  const formAccountRef = React.useRef<AutoFormRef>(null);
  return (
    <SectionCard title={"Thông tin tài khoản"} extra={
      <SafeButton variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => formAccountRef.current?.submit()}>
        Lưu
      </SafeButton>
    }>
      <AutoForm name="account" ref={formAccountRef} />
    </SectionCard>
  );
}

registerSlot({
  id: "account",
  name: "auth:left",
  priority: 2,
  render: () => <AccountWidget />,
});

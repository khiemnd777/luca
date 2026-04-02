import React from "react";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { useParams } from "react-router-dom";
import type { AutoFormRef } from "@core/form/form.types";
import { SafeButton } from "@shared/components/button/safe-button";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { AutoForm } from "@core/form/auto-form";

function CustomerDetailWidget() {
  const { customerId } = useParams();
  const frmCustomerInfRef = React.useRef<AutoFormRef>(null);
  return (
    <>
      <SectionCard title={"Thông tin khách hàng"} extra={
        <IfPermission permissions={["customer.update"]}>
          <SafeButton variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => frmCustomerInfRef.current?.submit()}>
            Lưu
          </SafeButton>
        </IfPermission>
      }>
        <AutoForm name="customer" ref={frmCustomerInfRef} initial={{ id: customerId }} />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "customer-detail",
  name: "customer-detail:left",
  render: () => <CustomerDetailWidget />,
})

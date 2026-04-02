import React from "react";
import { SectionCard } from "@shared/components/ui/section-card";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { registerSlot } from "@core/module/registry";
import { IfPermission } from "@core/auth/if-permission";
import { useParams } from "react-router-dom";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { SafeButton } from "@shared/components/button/safe-button";
import { getByOrderIdAndOrderItemId } from "../api/order.api";
import { Section } from "@root/shared/components/ui/section";
import { CircularProgress } from "@mui/material";
import type { OrderModel } from "../model/order.model";
import { useAsync } from "@root/core/hooks/use-async";

function OrderDetailHistoricalGeneralWidget() {
  const { orderId, orderItemId } = useParams();
  const frmOrderEditRef = React.useRef<AutoFormRef>(null);

  const { data: detail, loading } = useAsync<OrderModel | null>(
    () => {
      if (!orderId) return Promise.resolve(null);
      return getByOrderIdAndOrderItemId(
        Number(orderId ?? 0),
        Number(orderItemId ?? 0)
      );
    },
    [orderId, orderItemId],
    { key: `order-detail-historical-header:${orderId ?? "new"}:${orderItemId ?? "new"}` }
  );

  // page information
  const isOriginal = detail?.latestOrderItem?.code === detail?.code;
  const originalCodeLabel = !isOriginal ? ` ⬅ Mã gốc: ${detail?.code}` : '';
  const codeLabel = `Mã: ${detail?.latestOrderItem?.code}${originalCodeLabel}`
  // title
  const title = `${codeLabel}`;

  return (
    <>
      <SectionCard title={title ?? ""}
        extra={
          <>
            <IfPermission permissions={["order.create"]}>
              <SafeButton
                variant="outlined"
                startIcon={<SaveOutlinedIcon />}
                onClick={() => frmOrderEditRef.current?.submit()}
              >
                Lưu
              </SafeButton>
            </IfPermission>
          </>
        }
      >
        {loading || !detail ? (
          <Section alignItems="center" py={2}>
            <CircularProgress size={22} />
          </Section>
        ) : (
          <AutoForm
            name="order-historical-header"
            ref={frmOrderEditRef}
            initial={detail}
          />
        )}
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "__order-detail-historical-header",
  name: "__order-detail-historical:left",
  render: () => <OrderDetailHistoricalGeneralWidget />,
  priority: 99,
});

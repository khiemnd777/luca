import React from "react";
import { registerSlot } from "@core/module/registry";
import { useParams } from "react-router-dom";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { useAsync } from "@root/core/hooks/use-async";
import { Section } from "@root/shared/components/ui/section";
import { getByOrderIdAndOrderItemId, id as getById } from "../api/order.api";
import type { OrderModel } from "../model/order.model";
import { OrderInProgress } from "../components/order-inprogress.component";
import { Spacer } from "@root/shared/components/ui/spacer";

export function OrderInProgressDetailWidget() {
  const { orderId, orderItemId } = useParams();
  const parsedOrderId = orderId ? Number(orderId) : null;
  const parsedOrderItemId = orderItemId ? Number(orderItemId) : null;

  const { data: detail, loading: loadingDetail } = useAsync<OrderModel | null>(
    () => {
      if (!parsedOrderId) return Promise.resolve(null);
      if (parsedOrderItemId) {
        return getByOrderIdAndOrderItemId(parsedOrderId, parsedOrderItemId);
      }
      return getById(parsedOrderId);
    },
    [parsedOrderId, parsedOrderItemId],
    {
      key: `order-process-inprogress-detail:${parsedOrderId ?? ""}:${parsedOrderItemId ?? ""}`,
    }
  );

  const title = React.useMemo(() => {
    const codeTitle = detail?.latestOrderItem?.code;
    return codeTitle ? `Mã: ${codeTitle}` : "Đơn hàng";
  }, [detail?.latestOrderItem?.code]);

  return (
    <>
      <Section>
        {loadingDetail ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
        )}
      </Section>

      <Spacer />

      <OrderInProgress showPrescriptionFiles />
    </>
  );
}

registerSlot({
  id: "order-inprogress-detail",
  name: "order-inprogress-detail:left",
  priority: 99,
  render: () => <OrderInProgressDetailWidget />,
});

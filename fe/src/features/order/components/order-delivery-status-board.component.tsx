import { useParams } from "react-router-dom";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import { useAsync } from "@root/core/hooks/use-async";
import { Section } from "@root/shared/components/ui/section";
import ResponsiveStatusBoard from "@root/shared/components/status-board/responsive-status-board";
import { formatDateTime } from "@root/shared/utils/datetime.utils";
import {
  ORDER_DELIVERY_STATUS_OPTIONS,
  type OrderDeliveryStatus,
  deliveryStatusColor,
} from "@root/shared/utils/order.utils";
import {
  getDeliveryProofPhotoUrl,
  getDeliveryStatusByOrderItemId,
  id as getById,
  getByOrderIdAndOrderItemId,
  updateDeliveryStatus,
} from "../api/order.api";
import type { OrderItemModel } from "../model/order-item.model";
import type { OrderModel } from "../model/order.model";
import {
  resolveDeliveryProofUrl,
  resolveLatestOrderItem,
} from "../utils/order-delivery-proof.utils";
import { OrderDeliveryProofPhoto } from "./order-delivery-proof-photo.component";

type OrderDetailDeliveryStatusBoardProps = {
  orderId?: number;
};

type DeliveryBoardData = {
  orderId: number;
  orderItemId: number | null;
  order: OrderModel;
  orderItem: Partial<OrderItemModel> | null;
  deliveryStatus: OrderDeliveryStatus;
};

export function OrderDetailDeliveryStatusBoard({ orderId: explicitOrderId }: OrderDetailDeliveryStatusBoardProps) {
  const { orderId, orderItemId } = useParams();
  const effectiveOrderId = explicitOrderId ?? (orderId ? Number(orderId) : undefined);

  const { data, loading } = useAsync<DeliveryBoardData | null>(() => {
    return (async () => {
      if (typeof effectiveOrderId !== "number" || Number.isNaN(effectiveOrderId)) return null;
      const orderIdNumber = effectiveOrderId;

      if (orderItemId) {
        const orderItemIdNumber = Number(orderItemId);
        const [detail, deliveryStatus] = await Promise.all([
          getByOrderIdAndOrderItemId(orderIdNumber, orderItemIdNumber),
          getDeliveryStatusByOrderItemId(orderIdNumber, orderItemIdNumber),
        ]);
        const item = resolveLatestOrderItem(detail);
        const realOrderItemId = item?.id ?? orderItemIdNumber;
        return {
          orderId: orderIdNumber,
          orderItemId: realOrderItemId ?? null,
          order: detail,
          orderItem: item,
          deliveryStatus: (deliveryStatus ?? "pending") as OrderDeliveryStatus,
        };
      }

      const detail = await getById(orderIdNumber);
      const item = resolveLatestOrderItem(detail);
      const realOrderItemId = item?.id ?? null;
      const deliveryStatus = realOrderItemId
        ? await getDeliveryStatusByOrderItemId(orderIdNumber, realOrderItemId)
        : "pending";
      return {
        orderId: orderIdNumber,
        orderItemId: realOrderItemId,
        order: detail,
        orderItem: item,
        deliveryStatus: (deliveryStatus ?? "pending") as OrderDeliveryStatus,
      };
    })();
  }, [effectiveOrderId, orderItemId], {
    key: `order-delivery-status:${effectiveOrderId ?? "new"}:${orderItemId ?? "latest"}`,
  });

  const deliveryStatus = data?.orderItemId
    ? data.deliveryStatus ?? "pending"
    : "pending";

  const items = data?.orderItemId
    ? [
      {
        id: data.orderItemId,
        status: deliveryStatus,
        color: deliveryStatusColor(deliveryStatus),
        obj: data,
      },
    ]
    : [];

  return (
    <Section>
      {loading && (
        <Stack alignItems="center" py={2}>
          <CircularProgress size={22} />
        </Stack>
      )}

      {!loading && items.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Không có thông tin giao/nhận hàng.
        </Typography>
      )}

      {!loading && items.length > 0 && (
        <ResponsiveStatusBoard
          items={items}
          statuses={ORDER_DELIVERY_STATUS_OPTIONS}
          renderCard={(_id, _status, payload) => {
            const detail = payload.order;
            const item = payload.orderItem;
            const code = detail?.codeLatest ?? detail?.code ?? item?.code;
            const deliveryDate = detail?.deliveryDate ?? item?.deliveryDate;
            const proofUrl = resolveDeliveryProofUrl({
              order: payload.order,
              orderItem: payload.orderItem,
              orderItemId: payload.orderItemId,
              fallbackUrlFactory: getDeliveryProofPhotoUrl,
            });
            return (
              <Stack spacing={1}>
                {code && (
                  <Typography fontWeight={700}>{code}</Typography>
                )}
                {item?.productName && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Inventory2OutlinedIcon fontSize="small" />
                    <Typography>{item.productName}</Typography>
                  </Stack>
                )}
                {deliveryDate && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LocalShippingIcon fontSize="small" />
                    <Box>
                      <Typography variant="body2">
                        {formatDateTime(deliveryDate)}
                      </Typography>
                    </Box>
                  </Stack>
                )}
                {proofUrl && (
                  <OrderDeliveryProofPhoto
                    src={proofUrl}
                    alt={`Ảnh xác nhận giao hàng của đơn ${code ?? payload.orderId}`}
                  />
                )}
              </Stack>
            );
          }}
          onStatusChange={async (_id, newStatus, _oldStatus, payload) => {
            if (!payload.orderId || !payload.orderItemId) return;
            await updateDeliveryStatus(payload.orderId, payload.orderItemId, newStatus);
          }}
        />
      )}
    </Section>
  );
}

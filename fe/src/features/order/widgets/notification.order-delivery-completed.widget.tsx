import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { Box } from "@mui/material";
import NotificationItem from "@core/notification/notification-item";
import {
  registerNotificationRenderer,
  type NotificationRenderer,
} from "@core/notification/notification-renderer";

type OrderDeliveryCompletedNotificationData = {
  departmentId?: number | string;
  adminId?: number | string;
  orderId?: number | string;
  orderItemId?: number | string;
  orderItemCode?: string;
  href?: string;
};

const OrderDeliveryCompletedNotificationRenderer: NotificationRenderer<
  OrderDeliveryCompletedNotificationData
> = (notification, ctx) => {
  const data = notification.data;
  const title = `Đơn hàng #${data?.orderItemCode ?? ""} đã giao hoàn tất`;

  const bodyLines: string[] = [];

  if (data?.orderItemCode) {
    bodyLines.push(`Mã: ${data.orderItemCode}`);
  }

  const body =
    bodyLines.length > 0 ? (
      <Box>
        {bodyLines.map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </Box>
    ) : (
      notification.body || ""
    );

  const href = data?.href || (data?.orderId ? `/order/${data.orderId}` : "/order");

  const handleClick = () => {
    if (href) ctx.onAction?.(href);
    ctx.onClick?.();
  };

  return (
    <NotificationItem
      title={title}
      body={body}
      createdAt={notification.createdAt}
      unread={!notification.read}
      onClick={handleClick}
      icon={ctx.icon}
    />
  );
};

registerNotificationRenderer(
  "order:delivery:completed",
  OrderDeliveryCompletedNotificationRenderer,
  <LocalShippingIcon color="primary" />
);

export default OrderDeliveryCompletedNotificationRenderer;

import ChecklistIcon from "@mui/icons-material/Checklist";
import { Box } from "@mui/material";
import NotificationItem from "@core/notification/notification-item";
import {
  registerNotificationRenderer,
  type NotificationRenderer,
} from "@core/notification/notification-renderer";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

type OrderCheckoutNotificationData = {
  leaderId?: number | string;
  leaderName?: string;
  orderItemId?: number | string;
  orderItemCode?: string;
  productCode?: string;
  productName?: string;
  sectionName?: string;
  processName?: string;
  href?: string;
};

const OrderCheckoutNotificationRenderer: NotificationRenderer<
  OrderCheckoutNotificationData
> = (notification, ctx) => {
  const data = notification.data;

  const title = (
    <>
      Đơn hàng #<OrderCodeText code={data?.orderItemCode} /> đang chờ xử lý
    </>
  );

  const bodyLines: string[] = [];

  if (data?.productCode || data?.productName) {
    bodyLines.push(`Sản phẩm: ${[data.productCode, data.productName].filter(Boolean).join(" - ")}`);
  }

  if (data?.processName) {
    bodyLines.push(`Công đoạn: ${data.processName}`);
  }

  if (data?.sectionName) {
    bodyLines.push(`Phòng ban: ${data.sectionName}`);
  }

  const body =
    bodyLines.length > 0 || data?.orderItemCode ? (
      <Box>
        {data?.orderItemCode ? (
          <div>
            Mã: <OrderCodeText code={data.orderItemCode} />
          </div>
        ) : null}
        {bodyLines.map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </Box>
    ) : (
      notification.body || ""
    );

  const href = "/check-code";

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
  "order:checkout",
  OrderCheckoutNotificationRenderer,
  <ChecklistIcon color="primary" />
);

export default OrderCheckoutNotificationRenderer;

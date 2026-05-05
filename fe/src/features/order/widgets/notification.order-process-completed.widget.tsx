import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { Box } from "@mui/material";
import NotificationItem from "@core/notification/notification-item";
import {
  registerNotificationRenderer,
  type NotificationRenderer,
} from "@core/notification/notification-renderer";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

type OrderProcessCompletedNotificationData = {
  departmentId?: number | string;
  adminId?: number | string;
  orderId?: number | string;
  orderItemId?: number | string;
  orderItemCode?: string;
  productCode?: string;
  productName?: string;
  sectionName?: string;
  processName?: string;
  isFinalProcess?: boolean;
  href?: string;
};

const OrderProcessCompletedNotificationRenderer: NotificationRenderer<
  OrderProcessCompletedNotificationData
> = (notification, ctx) => {
  const data = notification.data;
  const title = (
    <>
      Đơn hàng #<OrderCodeText code={data?.orderItemCode} /> đã hoàn thành gia công
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

  if (data?.isFinalProcess) {
    bodyLines.push("Trạng thái: Hoàn thành công đoạn cuối");
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
  "order:process:completed",
  OrderProcessCompletedNotificationRenderer,
  <TaskAltIcon color="primary" />
);

export default OrderProcessCompletedNotificationRenderer;

import ChecklistIcon from "@mui/icons-material/Checklist";
import { Box } from "@mui/material";
import NotificationItem from "@core/notification/notification-item";
import {
  registerNotificationRenderer,
  type NotificationRenderer,
} from "@core/notification/notification-renderer";

type OrderCheckinNotificationData = {
  leaderId?: number | string;
  leaderName?: string;
  orderItemId?: number | string;
  orderItemCode?: string;
  sectionName?: string;
  processName?: string;
  href?: string;
};

const OrderCheckinNotificationRenderer: NotificationRenderer<
  OrderCheckinNotificationData
> = (notification, ctx) => {
  const data = notification.data;

  const title = `Đơn hàng #${data?.orderItemCode} đang chờ xử lý`;

  const bodyLines: string[] = [];

  if (data?.orderItemCode) {
    bodyLines.push(`Mã: ${data.orderItemCode}`);
  }

  if (data?.processName) {
    bodyLines.push(`Công đoạn: ${data.processName}`);
  }

  if (data?.sectionName) {
    bodyLines.push(`Phòng ban: ${data.sectionName}`);
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

  const href = data?.href || "/check-code";

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
  "order:checkin",
  OrderCheckinNotificationRenderer,
  <ChecklistIcon color="primary" />
);

export default OrderCheckinNotificationRenderer;

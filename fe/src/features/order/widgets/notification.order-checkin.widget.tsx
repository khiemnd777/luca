import ChecklistIcon from "@mui/icons-material/Checklist";
import { Box } from "@mui/material";
import NotificationItem from "@core/notification/notification-item";
import {
  registerNotificationRenderer,
  type NotificationRenderer,
} from "@core/notification/notification-renderer";

type OrderCheckinNotificationData = {
  orderId?: number | string;
  leaderId?: number | string;
  leaderName?: string;
  orderItemId?: number | string;
  orderItemCode?: string;
  relatedSectionNames?: string[] | string;
  relatedProcessNames?: string[] | string;
  href?: string;
};

function normalizeList(value?: string[] | string): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const OrderCheckinNotificationRenderer: NotificationRenderer<
  OrderCheckinNotificationData
> = (notification, ctx) => {
  const data = notification.data;

  const title = `Đơn hàng #${data?.orderItemCode} mới liên quan đến bộ phận bạn phụ trách`;

  const bodyLines: string[] = [];

  if (data?.orderItemCode) {
    bodyLines.push(`Mã: ${data.orderItemCode}`);
  }

  const relatedSections = normalizeList(data?.relatedSectionNames);
  if (relatedSections.length > 0) {
    bodyLines.push(`Phòng ban: ${relatedSections.join(", ")}`);
  }

  const relatedProcesses = normalizeList(data?.relatedProcessNames);
  if (relatedProcesses.length > 0) {
    bodyLines.push(`Công đoạn: ${relatedProcesses.join(", ")}`);
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
  "order:new",
  OrderCheckinNotificationRenderer,
  <ChecklistIcon color="primary" />
);

registerNotificationRenderer(
  "order:checkin",
  OrderCheckinNotificationRenderer,
  <ChecklistIcon color="primary" />
);

export default OrderCheckinNotificationRenderer;

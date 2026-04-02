import type { NotificationRenderer } from "@core/notification/notification-renderer";
import NotificationItem from "@core/notification/notification-item";

const DefaultNotificationRenderer: NotificationRenderer = (notification, ctx) => {
  const payload = notification.data as Record<string, unknown> | undefined;
  const titleFromData = typeof payload?.title === "string" ? payload.title : undefined;
  const title = titleFromData ?? notification.type ?? "Thông báo";

  return (
    <NotificationItem
      title={title}
      body={notification.body ?? ""}
      unread={notification.readAt === null}
      onClick={ctx.onClick}
      icon={ctx.icon}
    />
  );
};

export default DefaultNotificationRenderer;

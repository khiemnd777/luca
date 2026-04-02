import { createElement } from "react";
import DefaultNotificationRenderer from "./default-notification-renderer";
import { registerNotificationRenderer } from "./notification-renderer";
import NotificationsIcon from "@mui/icons-material/Notifications";

export { default as NotificationList } from "./notification-list";
export { default as NotificationItem } from "./notification-item";
export { default as DefaultNotificationRenderer } from "./default-notification-renderer";

export * from "./notification-renderer";
export * from "./notification.model";

registerNotificationRenderer(
  "__default__",
  DefaultNotificationRenderer,
  createElement(NotificationsIcon, { color: "primary" })
);

export * from "@core/notification/notification-renderer";
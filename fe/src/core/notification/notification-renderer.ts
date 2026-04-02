import * as React from "react";
import type { NotificationModel } from "./notification.model";

export type NotificationRenderCtx = {
  markAsRead?: () => void;
  onAction?: (action: string) => void;
  onClick?: () => void;
  icon?: React.ReactNode;
};

export type NotificationRenderer<T = any> = (
  notification: NotificationModel<T>,
  ctx: NotificationRenderCtx
) => React.ReactNode;

export type NotificationRendererEntry = {
  renderer: NotificationRenderer<any>;
  icon?: React.ReactNode;
};

const registry = new Map<string, NotificationRendererEntry>();

export function registerNotificationRenderer(
  type: string,
  renderer: NotificationRenderer<any>,
  icon?: React.ReactNode
) {
  registry.set(type, { renderer, icon });
}

export function getNotificationRenderer(type: string): NotificationRendererEntry | undefined {
  return registry.get(type);
}

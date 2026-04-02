import { apiClient } from "@core/network/api-client";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";
import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { NotificationModel } from "./notification.model";
import { invalidate } from "../hooks/use-async";

export async function countUnread(): Promise<number> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/notification/unread/count`);
  if (typeof data === "number") return data;
  if (typeof data?.count === "number") return data.count;
  if (typeof data?.unreadCount === "number") return data.unreadCount;
  const result = mapper.map<any, { count?: number; unreadCount?: number }>("Common", data, "dto_to_model");
  return result.count ?? result.unreadCount ?? 0;
  // return 100;
}

export async function shortList(): Promise<NotificationModel[]> {
  const { data } = await apiClient.get<any[]>(`${env.apiBasePath}/notification/short`);
  const result = mapper.map<any[], NotificationModel[]>("Common", data, "dto_to_model");
  return result;
}

export async function latestNotification(): Promise<NotificationModel | null> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/notification/latest`);
  if (!data) return null;
  const result = mapper.map<any, NotificationModel>("Common", data, "dto_to_model");
  return result;
}

export async function getByMessage(message: string): Promise<NotificationModel | null> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/notification/message`, {
    params: { message },
  });
  if (!data) return null;
  const result = mapper.map<any, NotificationModel>("Common", data, "dto_to_model");
  return result;
}

export async function markAsRead(id: number): Promise<NotificationModel | null> {
  const { data } = await apiClient.put<any>(`${env.apiBasePath}/notification/${id}/read`);
  if (!data) return null;
  invalidate("notification-unread-count");
  const result = mapper.map<any, NotificationModel>("Common", data, "dto_to_model");
  return result;
}

export async function deleteNotification(id: number): Promise<void> {
  await apiClient.delete<void>(`${env.apiBasePath}/notification/${id}`);
  invalidate("notification-unread-count");
  invalidate("notification-list-for-clear-all");
}

export async function deleteAllNotifications(): Promise<void> {
  await apiClient.delete<void>(`${env.apiBasePath}/notification`);
  invalidate("notification-unread-count");
  invalidate("notification-list");
  invalidate("notification-list-for-clear-all");
}

export async function listPaginated(tableOpts: FetchTableOpts): Promise<ListResult<NotificationModel>> {
  const { data } = await apiClient.getTable<any[]>(`${env.apiBasePath}/notification`, tableOpts);
  const result = mapper.map<any[], ListResult<NotificationModel>>("Common", data, "dto_to_model");
  return result;
}

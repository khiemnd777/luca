import { apiClient } from "@core/network/api-client";
import { env } from "@core/config/env";
import type {
  PushPublicConfig,
  PushSubscriptionRecord,
  PushSubscriptionUpsertPayload,
} from "./push-notification.types";

const basePath = `${env.apiBasePath}/notification`;

export async function getPushPublicConfig(): Promise<PushPublicConfig> {
  const { data } = await apiClient.get<PushPublicConfig>(`${basePath}/push-config`);
  return data;
}

export async function listPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const { data } = await apiClient.get<PushSubscriptionRecord[]>(`${basePath}/push-subscriptions`);
  return data ?? [];
}

export async function upsertPushSubscription(
  payload: PushSubscriptionUpsertPayload,
): Promise<PushSubscriptionRecord> {
  const { data } = await apiClient.post<PushSubscriptionRecord>(
    `${basePath}/push-subscriptions`,
    payload,
  );
  return data;
}

export async function deletePushSubscription(id: number): Promise<void> {
  await apiClient.delete(`${basePath}/push-subscriptions/${id}`);
}

export async function sendPushTestNotification(): Promise<Record<string, number>> {
  const { data } = await apiClient.post<Record<string, number>>(
    `${basePath}/push-subscriptions/test`,
    {},
  );
  return data ?? {};
}

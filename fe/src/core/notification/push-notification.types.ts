export type PushPublicConfig = {
  enabled: boolean;
  publicKey?: string;
  subject?: string;
};

export type PushSubscriptionRecord = {
  id: number;
  userId: number;
  endpoint: string;
  platform: string;
  deviceLabel?: string;
  userAgent?: string;
  installMode: string;
  permissionState: string;
  lastSeenAt: string;
  lastSentAt?: string | null;
  lastErrorAt?: string | null;
  lastError?: string | null;
  disabledAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PushSubscriptionUpsertPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
  platform: string;
  deviceLabel: string;
  userAgent: string;
  installMode: string;
  permissionState: NotificationPermission;
};

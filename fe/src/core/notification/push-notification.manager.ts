import {
  deletePushSubscription,
  getPushPublicConfig,
  listPushSubscriptions,
  upsertPushSubscription,
} from "./push-notification.api";
import type {
  PushSubscriptionRecord,
  PushSubscriptionUpsertPayload,
} from "./push-notification.types";

const SERVICE_WORKER_URL = "/push-sw.js";
const LOGOUT_PUSH_CLEANUP_TIMEOUT_MS = 1500;
const LOGOUT_SERVICE_WORKER_READY_TIMEOUT_MS = 1000;

type CurrentSubscriptionSyncResult = {
  synced: boolean;
  record?: PushSubscriptionRecord | null;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function supportsPushNotifications(): boolean {
  if (!isBrowser()) return false;

  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandaloneMode(): boolean {
  if (!isBrowser()) return false;

  const mediaStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

export function detectPlatform(): string {
  if (!isBrowser()) return "unknown";

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac|win|linux/.test(ua)) return "desktop";
  return "unknown";
}

export function getInstallMode(): string {
  return isStandaloneMode() ? "standalone" : "browser";
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(SERVICE_WORKER_URL, {
    scope: "/",
  });
}

function withTimeout<T, F>(promise: Promise<T>, timeoutMs: number, fallback: F): Promise<T | F> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch(() => resolve(fallback))
      .finally(() => window.clearTimeout(timer));
  });
}

async function getCurrentPushSubscription(
  registration?: ServiceWorkerRegistration,
  options?: { readyTimeoutMs?: number },
): Promise<PushSubscription | null> {
  const reg = registration ?? (
    options?.readyTimeoutMs
      ? await withTimeout(navigator.serviceWorker.ready, options.readyTimeoutMs, null)
      : await navigator.serviceWorker.ready
  );
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

function buildDeviceLabel(): string {
  if (!isBrowser()) return "";

  const platform = detectPlatform();
  const mode = getInstallMode();
  return `${platform.toUpperCase()} - ${mode}`;
}

function pushSubscriptionToPayload(subscription: PushSubscription): PushSubscriptionUpsertPayload {
  const json = subscription.toJSON();
  const keys = json.keys ?? {};

  return {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh ?? "",
    auth: keys.auth ?? "",
    platform: detectPlatform(),
    deviceLabel: buildDeviceLabel(),
    userAgent: navigator.userAgent,
    installMode: getInstallMode(),
    permissionState: Notification.permission,
  };
}

export async function enablePushNotifications(): Promise<PushSubscriptionRecord> {
  if (!supportsPushNotifications()) {
    throw new Error("Trình duyệt hiện tại không hỗ trợ Web Push.");
  }

  const config = await getPushPublicConfig();
  if (!config.enabled || !config.publicKey) {
    throw new Error("Push notification chưa được bật trên máy chủ.");
  }

  const registration = await registerServiceWorker();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Bạn chưa cấp quyền nhận thông báo cho trình duyệt này.");
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(config.publicKey) as BufferSource,
    }));

  return upsertPushSubscription(pushSubscriptionToPayload(subscription));
}

export async function syncCurrentPushSubscription(): Promise<CurrentSubscriptionSyncResult> {
  if (!supportsPushNotifications()) {
    return { synced: false };
  }

  const config = await getPushPublicConfig();
  if (!config.enabled) {
    return { synced: false };
  }

  if (Notification.permission !== "granted") {
    return { synced: false };
  }

  const registration = await registerServiceWorker();
  const subscription = await getCurrentPushSubscription(registration);
  if (!subscription) {
    return { synced: false };
  }

  const record = await upsertPushSubscription(pushSubscriptionToPayload(subscription));
  return { synced: true, record };
}

async function unlinkCurrentPushSubscriptionOnLogoutCore(): Promise<void> {
  if (!supportsPushNotifications()) {
    return;
  }

  const subscription = await getCurrentPushSubscription(undefined, {
    readyTimeoutMs: LOGOUT_SERVICE_WORKER_READY_TIMEOUT_MS,
  }).catch(() => null);
  if (!subscription) {
    return;
  }

  const currentEndpoint = subscription.endpoint;
  const records = await listPushSubscriptions().catch(() => []);
  const matched = records.filter((item) => item.endpoint === currentEndpoint);

  await Promise.allSettled(matched.map((item) => deletePushSubscription(item.id)));
}

export async function unlinkCurrentPushSubscriptionOnLogout(): Promise<void> {
  await withTimeout(
    unlinkCurrentPushSubscriptionOnLogoutCore(),
    LOGOUT_PUSH_CLEANUP_TIMEOUT_MS,
    undefined,
  );
}

export async function disablePushSubscription(record: PushSubscriptionRecord): Promise<void> {
  await deletePushSubscription(record.id);

  const subscription = await getCurrentPushSubscription().catch(() => null);
  if (subscription?.endpoint === record.endpoint) {
    await subscription.unsubscribe().catch(() => undefined);
  }
}

import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
  clearTokens,
} from "@core/network/token-utils";
import { refreshAccessToken } from "@core/network/auth-api";

type AuthEvent =
  | { type: "token_refreshed"; token: string }
  | { type: "logout"; reason?: string }
  | { type: "refresh_failed" }
  | { type: "login"; token: string };

type AuthListener = (event: AuthEvent) => void;

const EARLY_REFRESH_S = 30;
const BC_RACE_MS = 200;
const REFRESH_HARD_TIMEOUT_MS = 6000;
const LOGIN_PATH = "/login";

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
const refreshWaiters: Array<(token: string | null) => void> = [];
let lastRefreshFailedAt: number | null = null;
const listeners = new Set<AuthListener>();

const authBC =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("auth")
    : null;

function emit(event: AuthEvent) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // ignore listener errors
    }
  });
}

function broadcast(event: AuthEvent) {
  try {
    authBC?.postMessage(event);
  } catch {
    // ignore broadcast failures
  }
}

if (authBC) {
  authBC.addEventListener("message", (ev: MessageEvent<AuthEvent>) => {
    const event = ev.data;
    if (!event?.type) return;

    if (event.type === "token_refreshed" || event.type === "login") {
      saveAccessToken(event.token);
      clearRefreshFailFlag();
    }

    if (event.type === "refresh_failed") {
      lastRefreshFailedAt = Date.now();
    }

    if (event.type === "logout") {
      clearTokens();
    }

    emit(event);
  });
}

function isOnLogin(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.location?.pathname?.startsWith(LOGIN_PATH)
    );
  } catch {
    return false;
  }
}

export function getTokenExpSec(token?: string | null): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof payload?.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function secondsUntilExpiry(token?: string | null): number | null {
  const exp = getTokenExpSec(token);
  if (!exp) return null;
  return exp - Math.floor(Date.now() / 1000);
}

export function getAccessTokenSnapshot(): string | null {
  return getAccessToken();
}

export function hasUsableAccessToken(): boolean {
  const token = getAccessToken();
  const exp = getTokenExpSec(token);
  if (!exp) return false;
  return exp > Math.floor(Date.now() / 1000);
}

export function isAuthRefreshing(): boolean {
  return isRefreshing;
}

export function didLastRefreshFail(): boolean {
  return (
    !!lastRefreshFailedAt &&
    Date.now() - lastRefreshFailedAt < 5 * 60 * 1000
  );
}

function clearRefreshFailFlag() {
  lastRefreshFailedAt = null;
}

function flushRefreshWaiters(token: string | null) {
  while (refreshWaiters.length) {
    const resolve = refreshWaiters.shift()!;
    try {
      resolve(token);
    } catch {
      // ignore waiter errors
    }
  }
}

function waitExternalRefreshShort(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!authBC) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        authBC.removeEventListener("message", handler);
      } catch {
        // ignore
      }
      resolve(null);
    }, BC_RACE_MS);

    const handler = (ev: MessageEvent<AuthEvent>) => {
      const event = ev.data;
      if (!event?.type) return;

      if (event.type === "token_refreshed" || event.type === "login") {
        clearTimeout(timer);
        authBC.removeEventListener("message", handler);
        resolve(event.token);
      }

      if (event.type === "logout" || event.type === "refresh_failed") {
        clearTimeout(timer);
        authBC.removeEventListener("message", handler);
        resolve(null);
      }
    };

    authBC.addEventListener("message", handler);
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | "__TIMEOUT__"> {
  return Promise.race([
    promise,
    new Promise<"__TIMEOUT__">((resolve) =>
      setTimeout(() => resolve("__TIMEOUT__"), ms),
    ),
  ]);
}

export function bootstrapTokenSanity() {
  const token = getAccessToken();
  const remain = secondsUntilExpiry(token);
  if (token && (remain === null || remain <= 0)) {
    try {
      saveAccessToken("");
    } catch {
      // ignore
    }
  }
}

export async function refreshOnce(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  isRefreshing = true;

  const core = (async () => {
    try {
      if (isOnLogin()) return null;

      const external = await waitExternalRefreshShort();
      if (external) {
        saveAccessToken(external);
        clearRefreshFailFlag();
        emit({ type: "token_refreshed", token: external });
        return external;
      }

      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;

      const result = await refreshAccessToken(refreshToken);
      if (!result.accessToken) return null;

      saveAccessToken(result.accessToken);
      if (result.refreshToken) {
        saveRefreshToken(result.refreshToken);
      }

      clearRefreshFailFlag();
      const event: AuthEvent = {
        type: "token_refreshed",
        token: result.accessToken,
      };
      broadcast(event);
      emit(event);
      return result.accessToken;
    } catch {
      return null;
    }
  })();

  refreshPromise = withTimeout(core, REFRESH_HARD_TIMEOUT_MS).then((result) =>
    result === "__TIMEOUT__" ? null : result,
  );

  refreshPromise
    .then((token) => {
      isRefreshing = false;
      refreshPromise = null;

      if (token) {
        flushRefreshWaiters(token);
        return;
      }

      lastRefreshFailedAt = Date.now();
      const event: AuthEvent = { type: "refresh_failed" };
      broadcast(event);
      emit(event);
      flushRefreshWaiters(null);
    })
    .catch(() => {
      isRefreshing = false;
      refreshPromise = null;
      lastRefreshFailedAt = Date.now();
      const event: AuthEvent = { type: "refresh_failed" };
      broadcast(event);
      emit(event);
      flushRefreshWaiters(null);
    });

  return refreshPromise;
}

export function waitForRefreshResult(): Promise<string | null> {
  if (!isRefreshing) {
    return Promise.resolve(getAccessToken());
  }

  return new Promise((resolve) => {
    refreshWaiters.push(resolve);
  });
}

export async function ensureValidAccessToken(options?: {
  minValiditySeconds?: number;
}): Promise<string | null> {
  bootstrapTokenSanity();

  const minValiditySeconds =
    options?.minValiditySeconds ?? EARLY_REFRESH_S;
  const token = getAccessToken();
  const remain = secondsUntilExpiry(token);

  if (token && remain !== null && remain > minValiditySeconds) {
    return token;
  }

  if (!getRefreshToken()) {
    return token && remain !== null && remain > 0 ? token : null;
  }

  if (!isRefreshing) {
    return refreshOnce();
  }

  return waitForRefreshResult();
}

export function subscribeAuthEvents(listener: AuthListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyLogin(payload: {
  accessToken: string;
  refreshToken?: string | null;
}) {
  saveAccessToken(payload.accessToken);
  if (payload.refreshToken) {
    saveRefreshToken(payload.refreshToken);
  }
  clearRefreshFailFlag();

  const event: AuthEvent = { type: "login", token: payload.accessToken };
  broadcast(event);
  emit(event);
}

export function notifyLogout(reason?: string) {
  clearTokens();
  const event: AuthEvent = { type: "logout", reason };
  broadcast(event);
  emit(event);
}

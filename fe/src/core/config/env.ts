const baseAddress = import.meta.env.VITE_BASE_ADDRESS ?? "127.0.0.1:7999";
const httpProto = import.meta.env.VITE_HTTP_PROTOCOL ?? "http";
const wsProto = import.meta.env.VITE_WS_PROTOCOL ?? "ws";
const wsEnabledEnv = import.meta.env.VITE_ENABLE_WEBSOCKET;
const explicitApiOrigin = import.meta.env.VITE_API_ORIGIN;
const explicitWsOrigin = import.meta.env.VITE_WS_ORIGIN;

function resolveBrowserOrigin() {
  if (typeof window === "undefined") return undefined;

  return window.location.origin;
}

function toWebSocketOrigin(origin: string) {
  if (origin.startsWith("https://")) return `wss://${origin.slice("https://".length)}`;
  if (origin.startsWith("http://")) return `ws://${origin.slice("http://".length)}`;
  return origin;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return fallback;
}

const defaultApiOrigin = `${httpProto}://${baseAddress}`;
const defaultWsOrigin = `${wsProto}://${baseAddress}`;
const browserOrigin = resolveBrowserOrigin();
const useSameOriginDefaults = import.meta.env.MODE !== "development";
const apiOrigin =
  explicitApiOrigin ||
  (useSameOriginDefaults && browserOrigin ? browserOrigin : defaultApiOrigin);
const wsOrigin =
  explicitWsOrigin ||
  (useSameOriginDefaults && browserOrigin
    ? toWebSocketOrigin(browserOrigin)
    : defaultWsOrigin);

export const env = {
  mode: import.meta.env.MODE,
  wsEnabled: parseBooleanEnv(
    wsEnabledEnv,
    import.meta.env.MODE !== "development",
  ),
  apiOrigin,
  wsOrigin,
  apiBasePath: "/api",
  apiBaseUrl: `${apiOrigin}/api`,
  wsBaseUrl: `${wsOrigin}/ws`,
};

const baseAddress = import.meta.env.VITE_BASE_ADDRESS ?? "127.0.0.1:7999";
const httpProto = import.meta.env.VITE_HTTP_PROTOCOL ?? "http";
const wsProto = import.meta.env.VITE_WS_PROTOCOL ?? "ws";
const wsEnabledEnv = import.meta.env.VITE_ENABLE_WEBSOCKET;

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return fallback;
}

export const env = {
  mode: import.meta.env.MODE,
  wsEnabled: parseBooleanEnv(
    wsEnabledEnv,
    import.meta.env.MODE !== "development",
  ),
  apiOrigin: `${httpProto}://${baseAddress}`, // vd: http://127.0.0.1:7999
  wsOrigin: `${wsProto}://${baseAddress}`,   // vd: ws://127.0.0.1:7999
  apiBasePath: "/api",                       // prefix bắt buộc của server
  apiBaseUrl: `${httpProto}://${baseAddress}/api`, // vd: http://127.0.0.1:7999/api
  wsBaseUrl: `${wsProto}://${baseAddress}/ws`, // vd: ws://127.0.0.1:7999/ws
};

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "..");
  const sharedEnv = loadEnv(mode, repoRoot, "APP_");
  const appEnv = loadEnv(mode, __dirname, "VITE_");
  const baseAddress = appEnv.VITE_BASE_ADDRESS || "127.0.0.1:7999";
  const httpProto = appEnv.VITE_HTTP_PROTOCOL || "http";
  const target = `${httpProto}://${baseAddress}`;
  const proxyTarget =
    process.env.VITE_API_PROXY_TARGET ||
    appEnv.VITE_API_PROXY_TARGET ||
    target;
  const apiBasePath = "/api";
  const frontendOrigin = sharedEnv.APP_FE_ORIGIN || "http://localhost:5173";
  const frontendUrl = new URL(frontendOrigin);
  const devServerHost =
    process.env.VITE_DEV_SERVER_HOST ||
    appEnv.VITE_DEV_SERVER_HOST ||
    frontendUrl.hostname;
  const frontendPort = frontendUrl.port
    ? Number(frontendUrl.port)
    : frontendUrl.protocol === "https:"
      ? 443
      : 80;
  const devServerPort = Number(
    process.env.VITE_DEV_SERVER_PORT ||
      appEnv.VITE_DEV_SERVER_PORT ||
      frontendPort,
  );
  const usePolling =
    process.env.CHOKIDAR_USEPOLLING === "true" ||
    process.env.WATCHPACK_POLLING === "true";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@root": path.resolve(__dirname, "src"),
        "@core": path.resolve(__dirname, "src/core"),
        "@store": path.resolve(__dirname, "src/store"),
        "@routes": path.resolve(__dirname, "src/routes"),
        "@pages": path.resolve(__dirname, "src/pages"),
        "@features": path.resolve(__dirname, "src/features"),
        "@shared": path.resolve(__dirname, "src/shared"),
      },
    },
    server: {
      host: devServerHost,
      port: devServerPort,
      strictPort: true,
      watch: usePolling
        ? {
            usePolling: true,
          }
        : undefined,
      proxy: {
        // /api -> configured API origin, or the api service inside Docker dev.
        [apiBasePath]: {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

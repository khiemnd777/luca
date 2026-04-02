import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const baseAddress = env.VITE_BASE_ADDRESS || "127.0.0.1:7999";
  const httpProto = env.VITE_HTTP_PROTOCOL || "http";
  const target = `${httpProto}://${baseAddress}`;
  const apiBasePath = "/api";

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
      proxy: {
        // /api –> localhost:7999
        [apiBasePath]: {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});

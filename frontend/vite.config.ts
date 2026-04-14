import { defineConfig, loadEnv } from "vite";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_URL || "";
  const apiOrigin = apiBase ? apiBase.replace(/\/api\/?$/, "") : "";
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || apiOrigin || "http://localhost:5000";

  return {
    server: {
      host: "::",
      port: 5173,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

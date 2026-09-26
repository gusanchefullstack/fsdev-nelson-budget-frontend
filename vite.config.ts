import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    // Pre-bundle lazily loaded route deps so the dev server never reloads mid-session.
    optimizeDeps: { include: ["@dnd-kit/core", "@stepperize/react", "d3"] },
    // Same-origin API in dev, mirroring the Vercel rewrite in production
    server: {
      proxy: { "/api": { target: env.VITE_API_PROXY_TARGET ?? "http://localhost:3000" } },
    },
  };
});

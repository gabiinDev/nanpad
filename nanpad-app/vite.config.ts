import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  resolve: {
    alias: {
      // Alias locales de la app
      "@": path.resolve(__dirname, "./src"),
      "@ui": path.resolve(__dirname, "./src/ui"),
      "@features": path.resolve(__dirname, "./src/features"),
      "@app": path.resolve(__dirname, "./src/app"),
      // Core: apunta al source directamente para que Vite lo transpile junto con la app.
      // En producción, Vite bundlea desde el source del core sin necesidad de un build previo.
      "@nanpad/core": path.resolve(__dirname, "../packages/core/src/index.ts"),
      "@shared": path.resolve(__dirname, "../packages/core/src/shared"),
      "@modules": path.resolve(__dirname, "../packages/core/src/modules"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Vitest configuration
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));

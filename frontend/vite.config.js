import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/loans": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
      "/api/payments": {
        target: "http://localhost:8083",
        changeOrigin: true,
      },
      "/api/beneficiaries": {
        target: "http://localhost:8083",
        changeOrigin: true,
      },
      "/api/settlement": {
        target: "http://localhost:8083",
        changeOrigin: true,
      },
      "/api/notifications": {
        target: "http://localhost:8085",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});

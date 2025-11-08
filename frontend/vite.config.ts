import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy ALL API requests to FastAPI backend
      "/validate_proxies": "http://localhost:8000",
      "/start_search": "http://localhost:8000",
      "/get_status": "http://localhost:8000",
      "/get_results": "http://localhost:8000",
      "/list_sessions": "http://localhost:8000",
      "/get_session": "http://localhost:8000",
      "/download_screenshots": "http://localhost:8000",
      "/results": "http://localhost:8000",
    },
  },
});

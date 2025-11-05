import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "frontend",
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:4002",
        changeOrigin: true
      }
    },
    fs: {
      strict: false
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "wouter", "@tanstack/react-query"],
          ui: ["@radix-ui/react-slot", "lucide-react", "clsx", "tailwind-merge"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5005,
    strictPort: true,
    open: false,
    hmr: false,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

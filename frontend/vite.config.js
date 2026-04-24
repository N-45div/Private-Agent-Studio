import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "process"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    "process.env": {},
  },
  resolve: {
    alias: {
      fs: "/home/divij/vincent/agentvault/frontend/src/shims/empty.js",
      path: "/home/divij/vincent/agentvault/frontend/src/shims/path.js",
      "node:fs/promises": "/home/divij/vincent/agentvault/frontend/src/shims/empty.js",
      "fs/promises": "/home/divij/vincent/agentvault/frontend/src/shims/empty.js",
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
});

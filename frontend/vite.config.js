import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath } from "node:url";

const shim = (pathname) => fileURLToPath(new URL(pathname, import.meta.url));

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
      fs: shim("./src/shims/empty.js"),
      path: shim("./src/shims/path.js"),
      "node:fs/promises": shim("./src/shims/empty.js"),
      "fs/promises": shim("./src/shims/empty.js"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
});

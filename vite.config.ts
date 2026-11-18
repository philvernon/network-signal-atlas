import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { createAppViteConfig } from "../../tooling/vite/createAppViteConfig.ts";

export default defineConfig(({ mode }) => {
  const config = createAppViteConfig({
    appRoot: fileURLToPath(new URL(".", import.meta.url)),
    mode,
  });

  return {
    ...config,
    // The empty starter does not use the factory's map prebundles.
    optimizeDeps: { ...config.optimizeDeps, include: [] },
    server: { ...config.server, port: 5122, strictPort: true },
    preview: { ...config.preview, port: 5122, strictPort: true },
  };
});

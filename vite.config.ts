import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    babel({
      filter: new RegExp(/\.tsx?$/),
    }),
    remix(),
    tsconfigPaths(),
  ],
  build: {
    outDir: "build",
    copyPublicDir: false,
  },
  optimizeDeps: {
    include: ["@opentelemetry/otlp-proto-exporter-base"],
  },
  publicDir: "./public",
});

// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// When building on Vercel (VERCEL=1 is set automatically there), pin the Vercel
// deploy target. Inside Lovable builds this override is ignored.
const isVercelBuild =
  !!process.env["VERCEL"] ||
  !!process.env["VERCEL_ENV"] ||
  process.env["NITRO_PRESET"] === "vercel";

export default defineConfig({
  ...(isVercelBuild
    ? {
        nitro: {
          preset: "vercel",
        },
      }
    : {}),
  vite: {
    environments: {
      ssr: {
        build: {
          rollupOptions: {
            output: { inlineDynamicImports: true },
          },
        },
      },
    },
  },
  tanstackStart: {
    // Use the startup wrapper so production failures reach Vercel's Runtime Logs.
    server: { entry: "server" },
  },
});

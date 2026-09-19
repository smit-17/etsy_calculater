import type { NitroConfig } from "nitro/types";

// Nitro's current split SSR output can contain invalid cross-chunk exports,
// causing every Vercel request to fail even though the build succeeds.
// A single server bundle avoids that production-only chunking failure.
export default {
  inlineDynamicImports: true,
} satisfies NitroConfig;
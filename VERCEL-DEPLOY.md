# Deploying this app on Vercel

Two things caused the "This page didn't load" screen:

1. The build was producing output for a different hosting platform (Cloudflare).
   Fixed in `vite.config.ts` — when the build runs on Vercel it now targets Vercel.
2. The app starts without its database connection details unless they are added
   to the Vercel project.
3. An older prerelease of the Vercel server adapter could build successfully
   but crash when Vercel handled the first request. The adapter is now pinned to
   the corrected release, the app uses TanStack Start's standard server entry,
   and both server bundle layers are emitted without the broken split output.

## 1. Environment variables (required)

Vercel → Project → Settings → Environment Variables. Add each one to
Production, Preview and Development, copying the values from this project's
`.env` file:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_PROJECT_ID`

The `VITE_*` ones are baked in at build time, so a fresh deploy is required
after adding them — restarting is not enough.

## 2. Build settings

`vercel.json` sets them already:

- Framework preset: Other
- Install command: `bun install --frozen-lockfile`
- Build command: `npm run build`
- Output directory: leave empty (the build writes Vercel's own `.vercel/output`)
- Node.js version: 24.x

If the Vercel dashboard has manual overrides for Install Command, Build Command,
or Output Directory, clear them so `vercel.json` is used. The frozen install is
important: it makes Vercel deploy the exact dependency versions tested here.

## 3. Redeploy

Deployments → latest → Redeploy, with "Use existing build cache" unchecked.

If it still fails, open the failing deployment's Runtime Logs — the first error
line there tells which variable or step is missing.

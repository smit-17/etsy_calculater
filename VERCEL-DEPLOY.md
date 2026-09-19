# Deploying this app on Vercel

The blank "This page didn't load" screen appears when the app starts without its
database connection details. Add these in Vercel before redeploying.

## 1. Environment variables

Vercel → Project → Settings → Environment Variables (add to Production, Preview
and Development). Copy the values from this project's `.env` file:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | same as in `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same as in `.env` |
| `VITE_SUPABASE_PROJECT_ID` | same as in `.env` |
| `SUPABASE_URL` | same as in `.env` |
| `SUPABASE_PUBLISHABLE_KEY` | same as in `.env` |
| `SUPABASE_PROJECT_ID` | same as in `.env` |

The `VITE_*` ones are read at build time, so a redeploy is required after adding
them (do not just restart).

## 2. Build settings

`vercel.json` in this repo already sets everything:

- Framework preset: Other (`framework: null`)
- Build command: `npm run build`
- Output directory: `.vercel/output`
- `NITRO_PRESET=vercel` so the server build targets Vercel instead of Cloudflare

If the Vercel dashboard has manual overrides for Build Command / Output
Directory, clear them so `vercel.json` is used.

## 3. Redeploy

Deployments → latest → Redeploy, with "Use existing build cache" unchecked.

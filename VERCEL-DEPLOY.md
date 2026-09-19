# Final Vercel deployment instructions

The supplied ZIP was not suitable for uploading as a project because it contained
both `.git` and more than 37,000 `node_modules` files. Do not deploy that archive.
Use the clean deployment ZIP supplied with this fix, or connect the source repository.

The application now has the required Vercel setup:

1. The build was producing output for a different hosting platform (Cloudflare).
   Fixed in `vite.config.ts` — when the build runs on Vercel it now targets Vercel.
2. The app starts without its database connection details unless they are added
   to the Vercel project.
3. The server entry is loaded lazily, so startup errors are captured in Vercel's
   Runtime Logs instead of being hidden behind the generic error page.
4. The Vercel function is emitted as one server bundle to avoid adapter chunk errors.

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

1. Delete the failed Vercel project, or create a new Vercel project from the clean ZIP/repository.
2. Add the six environment variables above for Production, Preview and Development.
3. Leave Root Directory and Output Directory empty.
4. Deploy with Framework Preset set to Other.
5. If redeploying an existing project, turn off "Use existing build cache".

Do not upload `.env`, `.git`, `node_modules`, `.vercel`, `dist`, or `.output`.
If the deployment still fails, open Runtime Logs for the `__server` function. The
startup wrapper now records the original error and stack instead of only showing
"This page didn't load".

# Final Vercel deployment fix

## Goal
Make the uploaded Etsy calculator deploy reliably on Vercel without changing calculator behavior or cloud data.

## Changes
- Replace the fragile custom Vercel/Nitro server setup with the supported TanStack Start deployment path.
- Keep the existing error page, but ensure server startup failures are logged with their real cause.
- Remove conflicting or redundant deployment overrides that can produce an invalid Vercel server bundle.
- Provide a clean deployment package that excludes `.git`, `node_modules`, caches, and generated output.
- Update the deployment instructions with the exact Vercel settings and required environment variables.

## Verification
- Confirm the app still opens locally.
- Validate the generated Vercel output structure and server entry.
- Check the main calculator page and cloud-backed saved data initialization for startup errors.

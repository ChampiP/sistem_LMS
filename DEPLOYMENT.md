Deployment checklist for Vercel

This file lists required environment variables and steps to deploy the Next.js app on Vercel and to ensure Prisma is prepared.

Required environment variables (set in Vercel project settings > Environment Variables):

- DATABASE_URL: postgres://USER:PASS@HOST:PORT/DATABASE (production DB, e.g., Supabase or managed Postgres)
- JWT_SECRET: a long random secret used to sign auth tokens
- NEXT_PUBLIC_APP_NAME (optional): app display name
- NODE_ENV: production (Vercel sets this automatically)

Recommended Node version: 18.x or 20.x (Vercel will select a supported version automatically). If you want to pin, set the "engines" field in package.json.

Build & deploy steps (Vercel):

1. In Vercel, create a new project from this repository.
2. Add the environment variables listed above in the Vercel UI (Production scope).
3. Set the Build Command to: npm run build
4. Set the Output Directory to: (leave empty — Next.js App Router uses the default)
5. Vercel will run 'npm install' then 'npm run build'. Our package.json includes a "postinstall" script that runs `prisma generate` so the Prisma client will be generated during install.

Database migrations (production):
- Recommended: run migrations outside Vercel via CLI or CI before the first deploy to production to avoid running interactive migrations during build.
- Example (locally or in CI):

  npx prisma migrate deploy --preview-feature

  or using npm script:

  npm run prisma:deploy

- If you prefer to run migrations from Vercel during build, you can add a prebuild step in your Vercel settings or call `npx prisma migrate deploy` as part of your build command; be cautious with running migrations automatically on every deploy in production.

Seeding (optional):
- To seed data (development only), run locally:

  npm run seed

Security notes:
- Do not commit .env files containing secrets to the repo.
- Ensure `JWT_SECRET` is a long random secret and keep it only in Vercel secrets.
- Cookies are set with 'Secure' only when `NODE_ENV===production`, which is correct for Vercel.

Runtime considerations:
- The app uses Prisma + PostgreSQL. Verify that the production DB allows connections from Vercel's network (or use a managed DB like Supabase).
- If you plan to scale, consider connection pooling (e.g., PgBouncer) or Prisma Data Proxy.

Extra recommendations before go-live:
- Run the integration test locally against the production-like environment (seeded DB) to validate flows.
- Add monitoring/logging (Sentry or similar) for runtime errors.
- Consider rate-limiting or other protections for auth endpoints.

What's included now in this repo to help deploy:
- `postinstall` runs `prisma generate` so Prisma client is available during build
- `prisma:deploy` script added to run migrations in CI or manually
- Basic server-side validation utilities added in `lib/validators.ts` and used in registration, quiz creation and submit endpoints.

If you want, I can:
- Add a minimal `vercel.json` with rewrites/headers (not required by default)
- Wire an automated CI job (GitHub Actions) to run `prisma migrate deploy` before Vercel deploy
- Add a small `DEPLOYMENT_CHECKLIST.md` tailored to your production DB provider (e.g., Supabase)


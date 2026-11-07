# stocksy

NestJS (`backend/`, :3000, API under `/api`) + React/Vite (`frontend/`, :5000) + Postgres 18 with Prisma 7.

```
docker compose up --build
```

Open http://localhost:5000 — it fetches "Hello World!" from the backend via the Vite `/api` proxy.

Backend start runs `prisma generate` and `prisma migrate deploy`. Create new migrations with `pnpm exec prisma migrate dev --name <name>` in `backend/`.

## Authentication

Email + password sign-in with [better-auth](https://better-auth.com), mounted under `/api/auth/*` through `@thallesp/nestjs-better-auth`. Every API route requires a session by default; mark public routes with `@AllowAnonymous()` and read the current user with `@Session()`. `GET /api/me` returns the signed-in user.

Backend environment variables:

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | At least 32 characters (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Public origin the browser uses, i.e. the frontend (it proxies `/api` to the backend) |

`docker-compose.yml` sets dev-only values. Tests: `pnpm test` (unit) and `pnpm test:e2e` (needs a disposable Postgres in `DATABASE_URL` with migrations applied).

## Workspace

This is a pnpm workspace (`backend`, `frontend`) with one lockfile at the root. Run from the repo root:

```
pnpm install               # installs both apps
pnpm lint | test | build   # runs the script in every package
pnpm dev:backend           # or dev:frontend
pnpm --filter backend add <package>   # add a dependency to one app
```

The pnpm version is pinned in the root `package.json` (`packageManager`).

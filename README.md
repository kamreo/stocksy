# stocksy

NestJS (`backend/`, :3000, API under `/api`) + React/Vite (`frontend/`, :5000) + Postgres 18 with Prisma 7.

```
docker compose up --build
```

Open http://localhost:5000 — it fetches "Hello World!" from the backend via the Vite `/api` proxy.

Backend start runs `prisma generate` and `prisma db push` (no migration files yet; switch to `prisma migrate` once the schema needs history).

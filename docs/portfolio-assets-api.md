# Portfolio management and asset discovery

Implements Issue #16. Requests use the existing Better Auth session cookie and
the `/api` prefix. Sign in through the existing UI or Better Auth endpoints first.
All four endpoints require authentication; missing or expired sessions return 401.

## Portfolios

### POST /api/portfolios

Creates a portfolio owned by `session.user.id`. The caller cannot choose its owner.

Request:

```json
{"name":"Long-term","baseCurrency":"EUR"}
```

`name` must be a string containing 1–80 characters after trimming. `baseCurrency`
is optional, defaults to `USD`, and accepts `USD`, `EUR` or `PLN` after trimming
and uppercasing. Null is invalid. Unknown fields, including `userId` and `ownerId`,
are rejected. Names may repeat. Currency is metadata; no conversion is performed.

Response: **201 Created**

```json
{
  "id":"d5f8414d-02aa-4b5b-a0d5-65cab2391713",
  "name":"Long-term",
  "baseCurrency":"EUR",
  "createdAt":"2026-11-09T18:00:00.000Z",
  "updatedAt":"2026-11-09T18:00:00.000Z"
}
```

### GET /api/portfolios

Response: **200 OK**, an array of portfolio objects in the shape above. Only the
current user's portfolios are included, ordered by creation time descending, then
ID ascending. An empty list is `[]`. Ownership query parameters are never used.

### GET /api/portfolios/:id

Response: **200 OK**, one portfolio object in the shape above. The ID must be a
UUID v4. The database lookup includes both portfolio ID and session user ID.
Missing records and another user's records have the same **404** response.

## Asset discovery

### GET /api/assets/search?q=BTC

Searches symbol or name case-insensitively. Supply exactly one `q` string with
1–80 characters after trimming. Results are sorted by symbol then ID, capped at
20. No match returns **200 OK** with `[]`.

Response: **200 OK**

```json
[{"id":"crypto:bitcoin","symbol":"BTC","name":"Bitcoin","assetType":"CRYPTO"}]
```

The migration installs a small, shared catalog:

| Stable ID | Symbol | Name | Type |
|---|---|---|---|
| `crypto:bitcoin` | BTC | Bitcoin | CRYPTO |
| `crypto:ethereum` | ETH | Ethereum | CRYPTO |

IDs identify assets independently of market-data providers. Symbols are not unique.
The search reads PostgreSQL only; it returns no quotes and calls no provider.

## Errors

Invalid body, name, currency, UUID or search query: **400 Bad Request**. Examples:

```json
{"message":"Name must contain between 1 and 80 characters.","error":"Bad Request","statusCode":400}
```

```json
{"message":"Query q must contain between 1 and 80 characters.","error":"Bad Request","statusCode":400}
```

Missing or expired session: **401 Unauthorized**:

```json
{"message":"Unauthorized","statusCode":401}
```

Missing or inaccessible portfolio: **404 Not Found**:

```json
{"message":"Portfolio not found.","error":"Not Found","statusCode":404}
```

Unexpected failures use Nest's generic **500** response; database details are not
part of the API contract.

## Verification with a disposable database

Start Docker with Linux containers enabled. From the repository root, run one of
the scripts below. Local Node.js, pnpm and a running development application are
not required; the existing Dockerfile installs dependencies using the workspace
lockfile.

Windows (Windows PowerShell 5.1 or PowerShell 7):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/test-e2e.ps1
```

`-ExecutionPolicy Bypass` applies only to this process; it does not change the
machine's execution policy. PowerShell 7 users can use `pwsh` instead of
`powershell` with the same arguments.

Linux / macOS / Git Bash:

```sh
sh ./scripts/test-e2e.sh
```

Both scripts build the backend image, start a fresh PostgreSQL in a uniquely
named Compose project, generate Prisma, apply migrations and run both backend
E2E files. They pass `STOCKSY_E2E_DISPOSABLE=1` only to the test container. The
existing GitHub Actions test database remains supported without these scripts.

Docker and Vitest output streams directly to the terminal, including failed
assertions. Cleanup removes only the generated project's containers and database
volume, also after a failed step. A test or preparation failure returns a nonzero
exit code; cleanup does not turn it into success. If cleanup itself fails, the
script prints the project name so the remaining resources can be identified.
Forced process termination or a Docker outage can prevent cleanup.

The development database is separate and may remain running. Do not add the
disposable marker to the normal development container to bypass the E2E guard.
The scripts use the existing source bind mount, so `prisma generate` refreshes
the ignored generated client in `backend/src/generated/prisma` on the host.

These scripts run backend E2E only. Other checks remain separate:

```text
pnpm lint
pnpm test
pnpm --filter backend test:cov
pnpm build
git diff --check
```

Root `pnpm lint`, `pnpm test` and `pnpm build` run both workspace packages. Backend
unit files use `*.spec.ts`; E2E files use `*.e2e-spec.ts`. Frontend component tests
use the existing Vitest/Testing Library setup. E2E uses real local sessions and
Prisma; frontend tests mock HTTP. No test calls an external market-data API.

### Runner verification — 2026-11-18

| Command / check | Result |
|---|---|
| `pwsh -NoProfile -File ./scripts/test-e2e.ps1` | 36 backend E2E tests passed in two files; exit 0; test containers and database volume removed. |
| `sh ./scripts/test-e2e.sh` (Git Bash on Windows) | 36 backend E2E tests passed in two files; exit 0; test containers and database volume removed. |
| PowerShell parser and `bash -n scripts/test-e2e.sh` | Passed. |
| Temporary Docker-stub checks in Windows PowerShell, PowerShell 7 and Git Bash | 15 cases passed: success, test failure, build failure, cleanup failure and combined failures; verified exit codes, scoped cleanup, paths with spaces and stdout/stderr forwarding. |
| `git diff --check` and shell LF line-ending check | Passed. |

Native Linux/macOS execution was not available; the shell runner was exercised
through Git Bash. Application lint, unit tests, coverage and application builds
were not rerun for this script-only change. Docker image builds and Prisma
generation/migrations ran as part of the E2E commands above.

## Manual demo

```powershell
docker compose -f docker-compose.yml -p stocksy-issue16-demo up --build -d --wait
```

1. Open <http://localhost:5000>, register user A, and follow the **Portfolios** link.
2. Observe the empty list. Create **Long-term** with the default USD currency.
3. Open its detail and refresh; the data remains in PostgreSQL. Note its URL.
4. Return to the list. Create an EUR or PLN portfolio and open its detail.
5. Search `btc`, `Ethereum`, and an unmatched name. No prices or holdings are shown.
6. Sign out from Home, register user B, and observe their empty portfolio list.
7. Open user A's detail URL while signed in as B: **Portfolio not found.**
8. A blank create/search submission shows validation without sending the request.

Stop this demo with `docker compose -f docker-compose.yml -p stocksy-issue16-demo down`.
Its local database is retained for later demos. The disposable test scripts above
remove only their own uniquely named test database volumes.

## Explicit follow-up dependencies

- **Portfolio CREATE audit:** deliberately deferred with owner approval. Creation
  currently writes no AuditLog event. Person 3 must agree on the event contract
  and add atomic creation plus audit persistence. The project-wide audit
  requirement is not complete. There are no placeholder audit hooks.
- **Deletion:** Portfolio's User foreign key uses `ON DELETE CASCADE`, consistent
  with existing Session/Account relations. A User deletion removes their
  portfolios; deleting a portfolio does not remove its User. Better Auth user
  deletion remains disabled. This Issue adds no account or portfolio deletion API.
- **Future transactions/audit:** a restrictive Transaction-to-Portfolio foreign
  key could block User deletion; a cascading one could erase history. Database
  cascades do not call service methods or create audit events. Person 3 must
  define retention, actor references and retained snapshots before deletion is
  enabled. Do not automatically cascade-delete audit history.
- **Market data:** Person 4 must map stable catalog IDs to provider instruments.
  The unmerged PR #13 provides BTC/USDT data, not USD conversion or ETH support.
- **Excluded:** transactions, holdings, prices, watchlists, dashboard calculations,
  Portfolio PATCH/DELETE, new auth and infrastructure changes.


## AI assistance

OpenAI Codex assisted with implementation, tests and documentation.
The project author remains responsible for reviewing the changes.
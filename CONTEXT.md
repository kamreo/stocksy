## Project context

**Stack:** NestJS, React, Vitest  
**Product:** A portfolio dashboard for tracking stocks and cryptocurrencies, manually recording transactions, viewing holdings and performance, and reviewing record-level change history.

**MVP assumption:** Buy/sell transactions are recorded in the application; the app does not execute real orders through a broker or exchange.

## Working principles

- Each person owns one vertical feature area, including the relevant frontend/backend work where practical.
- Shared API contracts and data models are agreed early.
- Every feature should include tests, error states, and a short demo path.
- Integrate continuously; do not wait until the end to merge work.
- DevOps ownership includes developer experience, CI, deployment, and observability—not only initial setup.

---

## Person 1 — Portfolio Dashboard & Analytics

**Primary focus:** Frontend, with a small backend aggregation component.

### Frontend
- Portfolio overview page.
- Summary cards: total portfolio value, cost basis, unrealized P/L, and realized P/L where supported.
- Asset allocation chart.
- Holdings table with quantity, latest price, market value, and P/L.
- Loading, empty, error, and stale-price states.
- Base-currency display and basic sorting.

### Backend
- `GET /api/portfolios/:id/dashboard`
- Aggregate portfolio totals and allocation from holdings, transactions, and available market prices.
- Agree with the team on calculation rules and response DTOs.

### Tests
- Dashboard component states.
- Unit tests for aggregation and allocation calculations.
- Test missing quotes and empty portfolios.

### Definition of done
- A user can open a portfolio and understand its value, allocation, and current holdings.
- Values are labelled with their currency and quote freshness.
- Core calculations are covered by tests.

**Estimated effort:** Medium–high.

---

## Person 2 — Portfolio, Assets & Holdings

**Primary focus:** Backend domain and supporting frontend screens.

### Backend
- `PortfoliosModule` and `AssetsModule`.
- Create, list, and view portfolios.
- Asset search and supported asset metadata.
- Add/remove an asset from a watchlist or portfolio, depending on the final domain model.
- Ownership and authorization checks.
- Suggested endpoints:
  - `GET /api/portfolios`
  - `POST /api/portfolios`
  - `GET /api/portfolios/:id`
  - `GET /api/assets/search?q=BTC`
  - `GET /api/portfolios/:id/holdings`

### Frontend
- Portfolio list and portfolio creation form.
- Asset search/select interface.
- Holdings list or asset detail panel.
- Empty states and form validation.

### Tests
- Portfolio CRUD and validation.
- Asset search response mapping.
- Access denial when a user requests another user's portfolio.

### Definition of done
- A user can create and select a portfolio, search supported assets, and see its holdings.
- Users cannot access portfolios they do not own.

**Estimated effort:** Medium–high.

---

## Person 3 — Transactions & Record-Level Audit History

**Primary focus:** Backend transactions and audit logging, with a frontend history view.

### Backend
- `TransactionsModule` and `AuditLogModule`.
- Record manual `BUY` and `SELL` transactions.
- Validate quantity, unit price, currency, fees, and transaction date.
- Edit and soft-delete transactions.
- Record who changed what and when.
- Store field-level before/after values for tracked changes.
- Write the business change and audit event in the same database transaction where possible.
- Suggested endpoints:
  - `GET /api/portfolios/:id/transactions`
  - `POST /api/portfolios/:id/transactions`
  - `PATCH /api/transactions/:id`
  - `DELETE /api/transactions/:id`
  - `GET /api/transactions/:id/history`

### Frontend
- Transaction list and manual buy/sell form.
- Edit/delete actions.
- Record history timeline showing actor, timestamp, action, and before/after values.

### Tests
- Transaction validation and CRUD.
- Audit event creation for create/update/delete.
- Before/after diff generation.
- Audit history authorization and sensitive-field redaction.

### Definition of done
- A user can record and edit transactions.
- Each tracked change produces an audit entry.
- A user can open a transaction and inspect its history.
- Ordinary users cannot edit or delete audit entries.

**Estimated effort:** High; this is a core feature and deserves a clear owner.

---

## Person 4 — Market Data Integration & Asset Price Views

**Primary focus:** Backend integration, with a small frontend price/asset detail view.

### Backend
- `MarketDataModule`.
- Define a provider interface so the provider can be replaced without changing the rest of the application.
- Integrate one provider first (for example, CoinGecko for aggregated crypto prices or Binance public market data).
- Normalize asset symbols, currencies, timestamps, and prices.
- Cache quotes and respect rate limits.
- Handle provider errors, missing quotes, and stale data.
- Keep credentials server-side; never expose secret API keys in React.
- Suggested endpoints:
  - `GET /api/assets/:id/price`
  - Optional: `GET /api/assets/:id/history?range=7d`

### Frontend
- Asset detail panel with latest price and, if included, a simple historical chart.
- Last-updated timestamp and stale-data indicator.
- Friendly error state when a quote is unavailable.

### Tests
- Provider response normalization.
- Cache behavior and rate-limit handling.
- Missing quote and provider failure cases.
- Mock all external API calls in automated tests.

### Definition of done
- The app can retrieve and display a quote from one real provider.
- The UI makes data freshness clear.
- Provider failure does not break the whole dashboard.

**Estimated effort:** Medium–high.

---

## Person 5 — DevOps, Quality & Application Foundation

**Primary focus:** DevOps and integration, with a bounded application feature.

### DevOps / platform
- Docker setup for local development.
- Environment variable and secret-management conventions.
- CI pipeline for linting, type-checking, tests, and builds.
- Database migration workflow.
- Development/staging deployment.
- Health endpoint and basic structured logging.
- Error reporting and basic dependency health checks.
- README with local setup and troubleshooting instructions.

### Application feature
- `HealthModule` and `GET /api/health`.
- Basic account settings or profile page, if authentication is included in the MVP.
- Global API error handling and request validation conventions.
- Shared frontend/backend conventions: formatting, linting, environment configuration, and API error shape.

### Tests
- CI runs the required test suite.
- Health endpoint tests.
- Smoke test for the deployed app.
- Verify the application starts with documented environment variables.

### Definition of done
- A new team member can run the app using the README.
- CI blocks broken builds.
- The application is deployed to a shared environment.
- Health checks and logs help the team diagnose failures.
- The person also owns a demonstrable application feature, not only infrastructure.

**Estimated effort:** Medium–high, with work spread across the project.

---

## Shared integration contracts

Agree on these before implementation:

### Core entities
- `User`
- `Portfolio`
- `Asset`
- `Transaction`
- `MarketPrice`
- `AuditLog`

### Suggested API conventions
- Prefix routes with `/api`.
- Use DTOs for request validation and response contracts.
- Store timestamps in UTC and serialize them consistently.
- Use database decimal/numeric types for prices and quantities; define rounding rules.
- Standardize pagination, error responses, and authorization checks.
- Never expose provider secrets to the frontend.

### Suggested ownership map

| Area | Owner | Collaborators |
|---|---|---|
| Dashboard and analytics | Person 1 | Persons 2 and 4 |
| Portfolios and assets | Person 2 | Persons 1 and 4 |
| Transactions and audit history | Person 3 | Persons 1 and 2 |
| Market data | Person 4 | Persons 1 and 2 |
| DevOps and app foundation | Person 5 | Everyone |

Owners are responsible for implementation and tests in their area. Collaborators should agree on contracts rather than duplicate ownership.

---

## Suggested milestones

### Milestone 1 — Foundation and contracts
- Agree on data model, database, ORM, authentication assumptions, and API response shapes.
- Person 5 establishes local development, CI, and deployment basics.
- All owners create feature skeletons and agree on DTOs.

### Milestone 2 — End-to-end vertical slices
- Person 2 delivers portfolio creation and listing.
- Person 3 delivers transaction creation plus audit history.
- Person 4 delivers a quote from one provider.
- Person 1 delivers the first dashboard using agreed response contracts.
- Person 5 ensures CI and the shared environment work.

### Milestone 3 — Integration and polish
- Connect dashboard calculations to real holdings and quotes.
- Add edit/delete flows, empty/error/loading states, and authorization checks.
- Add integration tests and fix cross-feature issues.

### Milestone 4 — Demo readiness
- Deploy the MVP.
- Run through a scripted demo.
- Verify README setup, environment variables, tests, and known limitations.
- Prepare a short list of out-of-scope features.

---

## Suggested demo scenario

1. Create a portfolio with a base currency.
2. Search for and add a supported asset.
3. Record a buy transaction.
4. Show the transaction and corresponding audit history.
5. Fetch a market quote and show the updated holding value on the dashboard.
6. Edit the transaction and demonstrate the before/after history.
7. Show the stale-data or provider-error state using a mocked failure.
8. Run the test suite and show the CI result.

## Fairness notes

- Person 3 has a relatively complex domain feature; avoid assigning them extra unrelated backend work.
- Person 5 should contribute throughout the project and own a small application feature so their contribution is visible.
- Persons 1 and 4 should coordinate early on dashboard DTOs and quote freshness.
- Each person should have at least one testable backend, frontend, or platform deliverable.
- Reassess scope after the first milestone. If the schedule is short, remove optional price history, watchlists, and advanced P/L calculations before cutting tests or audit history.

## Decisions to confirm as a team

- Will the MVP support crypto only, stocks only, or both?
- Which database and ORM will be used?
- Is authentication in scope, and which approach will be used?
- Which base currencies are required?
- Which cost-basis method will be used for profit/loss?
- Is price history required, or is the latest quote enough?
- Where will the application be deployed?

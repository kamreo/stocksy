## 1. Overview

The application is a portfolio management dashboard that allows users to track investments, record buy and sell transactions, monitor portfolio performance, and review changes made to important records.

The MVP should focus on reliable portfolio tracking and a clear audit trail. Unless a brokerage integration is explicitly added, buy and sell actions in the MVP are **portfolio records only**; they do not execute real orders on an exchange or with a broker.

## 2. Technology Stack

- **Backend:** NestJS
- **Frontend:** React
- **Testing:** Vitest
- **Market data:** External market-data APIs behind a provider abstraction
- **API style:** REST for the MVP; WebSockets can be considered later for live updates

Database, ORM, authentication provider, deployment platform, and charting library are still to be selected.

## 3. Product Goals

- Give users a single dashboard for their investment portfolio.
- Track holdings and transaction history.
- Display current or latest available market prices.
- Calculate portfolio value and basic profit/loss metrics.
- Support manual recording of buy and sell transactions.
- Maintain an audit log showing who changed what and when.
- Keep market-data providers replaceable so the application is not tightly coupled to one API.

## 4. MVP Scope

### 4.1 Portfolio Dashboard

The dashboard should display:

- Total portfolio value in the selected base currency.
- Total cost basis, where supported by the chosen accounting method.
- Unrealized profit/loss and percentage return.
- Realized profit/loss from completed sell transactions, where supported.
- Allocation by asset and asset class.
- Holdings table with quantity, latest price, market value, and profit/loss.
- Recent transactions.
- Last market-data refresh time and data freshness status.

Calculations must clearly distinguish realized from unrealized profit/loss. The initial version should document its cost-basis method (for example, average cost or FIFO) and apply it consistently.

### 4.2 Portfolio and Holdings

Users should be able to:

- Create and manage a portfolio.
- Add supported assets to a watchlist or portfolio.
- View holdings and transaction history.
- Record an asset purchase or sale manually.
- Enter quantity, unit price, transaction date, fees, and optional notes.
- Edit or delete a transaction subject to audit-log rules.
- Filter and sort holdings and transactions.

Validation should prevent invalid quantities and malformed prices. The application should define how it handles selling more units than are currently held.

### 4.3 Market Data

The backend should retrieve market prices from external providers and expose a normalized internal format to the frontend.

Potential providers:

- **CoinGecko API** — aggregated cryptocurrency prices and historical market data. Documentation: https://docs.coingecko.com/
- **Binance Spot Market Data API** — exchange-specific cryptocurrency prices, ticker data, and candlesticks. Public market-data endpoints are available without API authentication. Documentation: https://developers.binance.com/docs/binance-spot-api-docs
- **Twelve Data** — potential option for equities, ETFs, forex, and crypto, depending on plan and licensing. Documentation: https://twelvedata.com/docs
- **Finnhub** — potential option for equities and other market data, subject to its plan and terms. Documentation: https://finnhub.io/docs/api

These are candidates, not a commitment to use every provider. Before launch, verify current rate limits, historical-data availability, attribution requirements, and commercial/display licensing. A free developer plan does not automatically grant unrestricted commercial use.

#### Market-data implementation guidelines

- Keep API keys on the server; never expose secret keys in React.
- Implement a `MarketDataProvider` interface so providers can be swapped.
- Normalize symbols, timestamps, currency codes, and price precision.
- Cache prices and avoid making one external request per dashboard component.
- Respect provider rate limits and retry transient failures with backoff.
- Store the provider and timestamp associated with each price.
- Show a stale-data indicator if the last refresh is too old.
- Do not treat a missing quote as a zero price.
- Use decimal-safe arithmetic for monetary values; avoid JavaScript floating-point arithmetic for financial calculations.

### 4.4 Transactions

Supported MVP transaction types:

- `BUY`
- `SELL`
- Optionally `DEPOSIT`, `WITHDRAWAL`, `FEE`, or `DIVIDEND` if required by the product scope.

A transaction should include:

- ID
- Portfolio ID
- Asset ID
- Transaction type
- Quantity
- Unit price
- Fee and fee currency
- Transaction currency
- Transaction date/time
- Notes
- Created by / created at
- Updated by / updated at

The application should not silently rewrite historical transactions when a user edits them. Each change must be auditable.

### 4.5 Audit Log — History of Changes

**Requirement:** Record who changed what and when, with a record-level history view.

The audit log should capture:

- Actor/user who performed the action.
- Action type: `CREATE`, `UPDATE`, or `DELETE`.
- Entity type and entity ID.
- Timestamp in UTC.
- Changed fields, where applicable.
- Previous and new values for changed fields, excluding secrets and sensitive data.
- Optional reason or comment.
- Request/correlation ID for troubleshooting, if available.

#### Audit-log behavior

- Create an audit entry when a tracked record is created, updated, or deleted.
- Record the audit entry in the same database transaction as the business change where possible.
- Do not allow normal users to edit or delete audit entries.
- Apply authorization checks to audit history.
- Avoid recording passwords, API secrets, access tokens, or other sensitive values.
- Use soft deletion or a retained snapshot where necessary so a deleted record's history remains accessible.
- Define a retention policy appropriate to the product and applicable legal requirements.

#### Example: Record history view

**Transaction #TX-1042**

| Date (UTC) | User | Action | Change |
|---|---|---|---|
| 2026-10-24 08:15:00 | alex@example.com | Created | BUY 0.25 BTC at 65,000 USD |
| 2026-10-24 08:22:10 | alex@example.com | Updated | Fee changed from 2 USD to 3 USD |
| 2026-10-24 08:30:45 | sam@example.com | Updated | Notes changed from empty to "Long-term holding" |

The interface should allow a user to open a record and inspect its chronological history, including field-level before/after values when permitted.

## 5. Suggested Architecture

### Backend modules (NestJS)

- `AuthModule` — authentication and authorization.
- `UsersModule` — user profile and account settings.
- `PortfoliosModule` — portfolio CRUD and access rules.
- `AssetsModule` — asset metadata and supported symbols.
- `TransactionsModule` — buys, sells, fees, and transaction validation.
- `MarketDataModule` — provider adapters, caching, normalization, and refresh jobs.
- `DashboardModule` — aggregated portfolio metrics for the UI.
- `AuditLogModule` — append-only audit events and record history.
- `HealthModule` — application and dependency health checks.

### Frontend areas (React)

- Login / account screens.
- Portfolio overview dashboard.
- Holdings and allocation views.
- Transaction list and transaction form.
- Asset search and watchlist.
- Record detail page with history/audit timeline.
- Settings, base currency, and account preferences.

### High-level flow

1. React requests dashboard and portfolio data from the NestJS API.
2. NestJS reads portfolio and transaction data from the database.
3. `MarketDataModule` obtains cached or refreshed quotes from the configured provider.
4. The backend calculates portfolio metrics and returns a normalized response.
5. When a user changes a record, the business update and audit event are persisted.
6. React refreshes the relevant view and can display the updated history.

## 6. Suggested Data Model

The following is a starting point and should be adjusted after choosing the database and ORM.

### `User`

- `id`
- `email`
- `displayName`
- `createdAt`
- `updatedAt`

### `Portfolio`

- `id`
- `userId`
- `name`
- `baseCurrency` (for example, `USD`, `EUR`, or `PLN`)
- `createdAt`
- `updatedAt`

### `Asset`

- `id`
- `symbol` (for example, `BTC` or `AAPL`)
- `name`
- `assetType` (for example, `CRYPTO`, `STOCK`, or `ETF`)
- `marketDataProvider`
- `providerAssetId` or provider-specific symbol
- `createdAt`
- `updatedAt`

### `Transaction`

- `id`
- `portfolioId`
- `assetId`
- `type`
- `quantity`
- `unitPrice`
- `currency`
- `fee`
- `feeCurrency`
- `occurredAt`
- `notes`
- `createdBy`
- `createdAt`
- `updatedBy`
- `updatedAt`
- `deletedAt` (nullable, if soft deletion is used)

### `MarketPrice`

- `id`
- `assetId`
- `price`
- `currency`
- `provider`
- `observedAt`
- `fetchedAt`

### `AuditLog`

- `id`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `occurredAt`
- `changes` (structured before/after values)
- `reason` (optional)
- `correlationId` (optional)

Use database decimal/numeric types for quantities and prices where appropriate. Define precision and rounding rules explicitly.

## 7. Example REST API

Route names are illustrative and can be revised during implementation.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/portfolios` | List the current user's portfolios |
| `POST` | `/api/portfolios` | Create a portfolio |
| `GET` | `/api/portfolios/:id` | Get portfolio details |
| `GET` | `/api/portfolios/:id/dashboard` | Get portfolio metrics and allocation |
| `GET` | `/api/portfolios/:id/holdings` | List holdings with latest available prices |
| `GET` | `/api/portfolios/:id/transactions` | List transactions |
| `POST` | `/api/portfolios/:id/transactions` | Record a buy or sell |
| `PATCH` | `/api/transactions/:id` | Update a transaction |
| `DELETE` | `/api/transactions/:id` | Delete/soft-delete a transaction |
| `GET` | `/api/transactions/:id/history` | Get the transaction's audit history |
| `GET` | `/api/assets/search?q=BTC` | Search supported assets |
| `GET` | `/api/assets/:id/price` | Get the latest available quote |

All endpoints that access user-owned data must enforce authentication and ownership/authorization checks.

## 8. Testing Strategy

Use **Vitest** for unit and integration tests where compatible with the selected NestJS setup. Confirm the NestJS test configuration and tooling before standardizing the test runner.

### Unit tests

- Portfolio valuation and allocation calculations.
- Realized/unrealized profit and loss calculations.
- Transaction validation and sell constraints.
- Currency and decimal rounding behavior.
- Market-data response normalization.
- Audit-diff generation and sensitive-field redaction.

### Integration tests

- Create, update, and delete a transaction.
- Verify the matching audit entry is created.
- Verify the audit entry is persisted atomically with the business change.
- Verify one user cannot access another user's portfolio or audit history.
- Verify provider errors, rate limits, stale data, and missing quotes are handled gracefully.

### Frontend tests

- Dashboard loading, empty, error, and stale-data states.
- Holdings and transaction rendering.
- Transaction form validation.
- Audit history timeline and before/after values.
- Access-controlled views.

Use mocked market-data responses in automated tests so the test suite is deterministic and does not depend on external API availability.

## 9. MVP Acceptance Criteria

The MVP is ready for review when:

- A user can create and view a portfolio.
- A user can manually record, update, and remove a buy/sell transaction.
- The application displays holdings and portfolio value using available quotes.
- The dashboard distinguishes data freshness and missing prices.
- Portfolio calculations follow documented cost-basis and currency rules.
- Every tracked create/update/delete operation produces an audit entry.
- A user can view the change history of an individual record.
- Audit history is protected from unauthorized access and normal-user modification.
- Automated tests cover core calculations, transaction flows, authorization, and audit logging.
- Market-data credentials are stored server-side and provider limits are respected.

## 10. Out of Scope for the Initial MVP

Unless specifically agreed otherwise, the first release does not include:

- Executing real trades through a broker or exchange.
- Custody of user funds or private keys.
- Automated tax reporting.
- Advanced options, futures, margin, or leveraged trading.
- Guaranteed real-time market quotes.
- Full accounting for every corporate action.
- Multi-provider failover and enterprise-level market-data SLAs.

## 11. Suggested Implementation Order

1. Confirm product scope, supported asset classes, currencies, and cost-basis method.
2. Set up NestJS, React, Vitest, database, migrations, and authentication.
3. Implement portfolios, assets, and transaction CRUD.
4. Implement audit logging and record-level history early, before adding more mutation flows.
5. Add a market-data provider adapter and caching.
6. Implement portfolio calculations and dashboard endpoints.
7. Build dashboard, holdings, transaction forms, and history UI.
8. Add automated tests, authorization checks, rate-limit handling, and deployment monitoring.

## 12. Open Decisions

- Which database and ORM will be used?
- Will the first release support crypto only, stocks only, or both?
- Is this a manual portfolio tracker, or must it execute trades through a broker/exchange?
- Which base currencies are required?
- Which cost-basis method should be used?
- Is the product personal/internal, or intended for public commercial use?
- What are the expected refresh frequency and data freshness requirements?
- Which authentication and deployment providers will be used?
# Payment Indexer

Indexes Snapshot Pro ("turbo") payments and exposes them over GraphQL. Two
payment paths feed the same `Payment` / `Space` tables, so billing and turbo
enforcement don't care where the money came from:

- **Onchain (EVM)** — the `Schnaps` contract on Ethereum (Sepolia for testnet).
- **Stripe** — card subscriptions for Snapshot Pro.

Both run on [`@snapshot-labs/checkpoint`](https://github.com/snapshot-labs/checkpoint).

## How it works

Each indexer is a `config` + `writers` pair registered with `checkpoint.addIndexer`
(see `src/index.ts`). The config's `sources[].events` map an event to a writer
`fn`; checkpoint validates every `fn` against the indexer's handlers and calls it
per matching event.

- **EVM** (`src/config.ts`, `src/writers.ts`) — the built-in `evm.EvmIndexer`
  matches contract logs to `handlePaymentReceived`, which writes the `Payment`
  and extends `Space.turbo_expiration`.
- **Stripe** (`src/stripe/`) — same shape. `config.ts` declares the sources
  (`charge` → `indexPayment`, `refund` → `refundPayment`,
  `customer.subscription.deleted` → `cancelSubscription`); `writers.ts` exports
  them via `createStripeWriters`. Stripe has no blocks, so `indexer.ts` maps each
  1h window to a "block" and polls the durable Stripe resources (charges,
  refunds, events) for that window — no webhook, and replay stays correct on
  every boot. A charge grants/extends turbo, a full refund removes the period, a
  cancellation only notifies (the paid period stands).

Payments and expirations are announced to Discord. A background monitor
(`src/expirationMonitor.ts`) posts spaces that are expiring or recently expired.

## HTTP endpoints

- `POST /stripe/create` — `{ space, plan, success_url, cancel_url }` → a Stripe
  Checkout URL (`plan` is `monthly` or `yearly`).
- `GET /stripe/portal` — the Stripe Customer Portal login URL.
- `/` — the GraphQL API for indexed payments and spaces.

## Run it

```sh
bun install         # install, from the monorepo root
bun run codegen     # generate models from src/schema.gql
bun run dev         # watch mode
```

`bun run build` compiles to `dist/`, `bun run start` runs it. Requires a
PostgreSQL database (`DATABASE_URL`). `docker compose up` starts one that matches
`.env.example`. The database is rebuilt from scratch only when what gets indexed
changes (`INDEXING_FILES` in `src/index.ts`). Other restarts resume.

## Configuration

Copy `.env.example` to `.env`:

- `DATABASE_URL` — PostgreSQL connection string (required).
- `STRIPE_SECRET_KEY` — enables the Stripe indexer and endpoints; omit to disable.
- `DISCORD_WEBHOOK_URL` — payment notifications.
- `DISCORD_EXPIRATION_WEBHOOK_URL` — expiration monitor notifications.
- `ADMIN_ADDRESS` — address whose zero-amount payments set expiration directly.
- `HYPERSYNC_API_TOKEN` — index through Envio HyperSync instead of the RPC; replays get much faster.
- `INDEX_TESTNET` — index Sepolia instead of Ethereum.
- `SENTRY_DSN`: error reporting; omit to disable.

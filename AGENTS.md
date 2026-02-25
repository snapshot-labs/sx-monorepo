# AGENTS.md

## Commands

```bash
yarn dev                # Start UI only (excludes API and Mana)
yarn dev:interactive    # Interactive service selection (UI, API, Mana)
yarn build              # Build all packages
yarn test               # Run tests across all packages
yarn test:integration   # Run integration tests
yarn test:e2e           # Run Playwright end-to-end tests
yarn lint               # Lint all code and scripts
yarn lint:fix           # Lint and auto-fix
yarn typecheck          # TypeScript type checking
```

CI will reject lint/type/test failures.

## Repo Structure

| Directory        | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `apps/ui`        | Vue 3 frontend                                                        |
| `apps/api`       | Apollo GraphQL server + Checkpoint blockchain indexer                 |
| `apps/mana`      | Express transaction relayer                                           |
| `apps/highlight` | Highlight integration app                                             |
| `packages/sx.js` | Shared TypeScript SDK for governance (published as @snapshot-labs/sx) |
| `scripts/`       | Monorepo dev scripts (dev-interactive, etc.)                          |
| `tests/`         | E2E tests (Playwright)                                                |
| `docs/`          | Documents describing common patterns in the codebase                  |

## Architecture

Snapshot monorepo. Three services communicate across multiple blockchain networks.

**UI** (Vue 3) → queries **API** via GraphQL for governance data, submits transactions to **Mana** via JSON-RPC.

**API** (Apollo + Checkpoint) → indexes governance events from EVM, Starknet, and offchain. Serves unified GraphQL for spaces, proposals, votes, users. Supports Snapshot X, Compound Governor, OpenZeppelin Governor. Can run indexer-only or API-only.

**Mana** (Express) → relays transactions for gasless voting, handles cross-chain execution (L1↔L2), manages relayer wallets and automated proposal execution.

**SX.js** → shared SDK used by all services for signing, and blockchain interactions.

**[snapshot-hub](https://github.com/snapshot-labs/snapshot-hub)** (external) → API and data store for offchain Snapshot spaces. UI queries it for offchain governance data.

**[snapshot-sequencer](https://github.com/snapshot-labs/snapshot-sequencer)** (external) → receives signed messages for offchain votes, proposals, and space management. UI submits offchain actions to it.

### Data Flow

1. UI fetches governance data via GraphQL from API (Hub for offchain spaces)
2. UI submits transactions via JSON-RPC to Mana or sends signed messages to sequencer
3. API indexes blockchain events and serves aggregated data
4. Mana executes transactions on-chain and handles cross-chain messaging

## Key Concepts

- **Spaces** — governance DAOs with voting configs and execution strategies. Two types:
  - **Onchain spaces** — indexed by API in this repo. Protocols: Snapshot X, Compound Governor, OpenZeppelin Governor
  - **Offchain spaces** — Snapshot spaces fetched from [snapshot-hub](https://github.com/snapshot-labs/snapshot-hub). Writes go through [snapshot-sequencer](https://github.com/snapshot-labs/snapshot-sequencer).
- **Strategies** — voting power calculation (token balance, whitelist, cross-chain proofs)
- **Executors** — onchain execution patterns (Safe, Timelock)

## Tooling

- **Node** >=22.6, **Yarn** 1.22 (workspaces: `apps/*`, `packages/*`)
- **Turborepo** for task orchestration (`turbo.json`)
- **ESLint** `@snapshot-labs` config (Vue variant for UI)
- **Prettier** `@snapshot-labs/prettier-config`

## Conventions

- Code needs to pass lint and type checks to be merged
- Use TypeScript whenever possible, avoid `any`
- Reuse existing code when possible — check helpers, composables, and utils before writing new logic
- Name errors in catch blocks `err`: `catch (err) { ... }`

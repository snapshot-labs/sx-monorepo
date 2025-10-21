# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
# Start UI only (excludes mana and api services)
yarn dev

# Interactive service selection (UI, API, Mana)
yarn dev:interactive

# Build all packages
yarn build

# Run tests across all packages
yarn test

# Run integration tests
yarn test:integration

# Lint all code and scripts
yarn lint

# TypeScript type checking
yarn typecheck
```

### Per-Application Commands
```bash
# UI (apps/ui)
cd apps/ui
yarn dev           # Start on port 8080
yarn test:watch    # Watch mode for tests
yarn storybook     # Component documentation

# API (apps/api)
cd apps/api
yarn dev           # Start GraphQL server + indexer
yarn codegen       # Generate GraphQL types from schema

# Mana (apps/mana)
cd apps/mana
yarn dev           # Start relayer service
yarn migrate       # Run database migrations
```

### Package Versioning
```bash
yarn changeset     # Create changeset for package releases
yarn release       # Build and publish packages
```

## Architecture Overview

This is a governance platform monorepo with three main services communicating across multiple blockchain networks.

### Service Architecture

**UI Service (apps/ui)**: Vue 3 frontend with multi-network wallet integration
- GraphQL queries to API service for governance data
- JSON-RPC calls to Mana service for transaction execution
- Supports EVM chains, Starknet, and offchain Snapshot spaces

**API Service (apps/api)**: Apollo GraphQL server + blockchain indexer
- Indexes governance events from multiple chains using Checkpoint framework
- Provides unified GraphQL API for spaces, proposals, votes, and users
- Can run as indexer-only or API server-only mode

**Mana Service (apps/mana)**: Transaction relayer and execution service
- Provides gasless voting through meta-transactions
- Handles cross-chain governance execution (L1↔L2)
- Manages relayer wallets and automated proposal execution

### Network Support Pattern

The codebase implements a unified interface for multiple blockchain networks:

- **Factory Pattern**: `createEvmNetwork()`, `createStarknetNetwork()`, `createOffchainNetwork()`
- **Common Interface**: All networks implement BaseNetwork with standardized actions, API, and helpers
- **Network-Specific Modules**: Each network type has `actions.ts`, `constants.ts`, `helpers.ts` structure

### Component Architecture (UI)

**Atomic Design Pattern**: Components organized in hierarchical structure
- `Ui/` - Base reusable components (Button, Modal, Form, etc.)
- `Modal/` - 40+ specialized modal components
- `Layout/`, `App/`, `Site/` - Layout and navigation components
- Feature-specific components for proposals, spaces, voting

**Composition API**: All components use Vue 3 `<script setup>` with TypeScript
**Composables**: 30+ composables provide reusable logic (`useWeb3`, `useModal`, `useSpaceController`)
**Form System**: Schema-driven forms with specialized input components

**Auto-Imports**: The UI uses unplugin-auto-import and unplugin-vue-components for automatic imports:
- **Vue APIs**: No need to import `ref`, `computed`, `watch`, `onMounted`, etc. from `vue`
- **Vue Router**: `useRoute`, `useRouter` are auto-imported from `vue-router`
- **VueUse**: All VueUse composables like `useEventListener`, `useLocalStorage` are auto-imported from `@vueuse/core`
- **Composables**: All files in `src/composables/` are auto-imported (e.g., `useWeb3()`, `useModal()`)
- **Stores**: All files in `src/stores/` are auto-imported
- **Components**: All components in `src/components/` are auto-imported using directory-as-namespace pattern:
  - `src/components/Ui/Button.vue` → `<UiButton />`
  - `src/components/Modal/Vote.vue` → `<ModalVote />`
  - `src/components/App/TopNavigation.vue` → `<AppTopNavigation />`
- **Icons**: Heroicons are auto-imported with prefixes:
  - `IH-` for heroicons-outline (e.g., `<IH-search />`, `<IH-exclamation-circle />`)
  - `IS-` for heroicons-solid
  - Custom icons from `src/assets/icons/` use `IC-` prefix

### Data Flow

1. **UI** fetches governance data via GraphQL from **API**
2. **UI** submits transactions via JSON-RPC to **Mana** 
3. **API** indexes blockchain events and serves aggregated data
4. **Mana** executes transactions on-chain and handles cross-chain messaging

### Key Concepts

**Spaces**: Governance DAOs with voting configurations and execution strategies
**Strategies**: Voting power calculation methods (token balance, whitelist, cross-chain proofs)
**Executors**: On-chain execution patterns (Safe, Timelock, Axiom ZK proofs)
**Networks**: Blockchain networks with unified interface pattern

### Development Environment Setup

Requires Node.js >=22.6 and Docker for local services.

For full local development with all services:
1. Copy `.env.example` to `.env` in `apps/api` and `apps/mana`
2. Fill `WALLET_SECRET` in `apps/mana/.env` for relayer functionality
3. Add Herodotus API keys for L1↔L2 messaging
4. Run `yarn dev:interactive` to select services

**Performance Note**: First-time indexing is slow. Speed up by modifying starting blocks in:
- `apps/api/src/starknet/config.ts` (line ~40) 
- `apps/api/src/evm/config.ts` (line ~23)

### Vue Query Patterns

Uses TanStack Query for server state management. Key conventions:
- Put query composables in `src/queries/` directory
- Use `MaybeRefOrGetter` for reactive query keys
- Query keys must be reactive: `["proposals", spaceId, "list"]`
- Always handle `isPending`, `isError`, and `data` states in components

See `docs/vue-query.md` for detailed usage patterns.

### Packages

**sx.js**: Shared TypeScript library for governance functionality
- Use `yarn changeset` when modifying versioned packages
- Automated releases via changesets GitHub action
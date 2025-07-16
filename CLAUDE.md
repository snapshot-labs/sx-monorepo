# Snapshot Labs monorepo

This monorepo contains the unified interface for the Snapshot protocol - a gasless, offchain voting platform for DAOs, DeFi protocols, and NFT communities - and Snapshot X, the onchain voting protocol. The repository includes the Snapshot X API for blockchain indexing and the meta transaction relayer Mana.

For more information see [Snapshot documentation](https://docs.snapshot.box) and [Snapshot help center](https://help.snapshot.box).

## Architecture overview

This is a Turborepo monorepo with three main applications:

- **`apps/ui/`** - Vue 3 frontend interface for both Snapshot and Snapshot X protocols
- **`apps/api/`** - Snapshot X GraphQL API server for indexing onchain data  
- **`apps/mana/`** - Meta transaction relayer service for gasless onchain interactions

## Essential commands

### Development
- `yarn dev` - Start UI development server (excludes mana and api)
- `yarn dev:interactive` - Interactive development mode to select services
- `yarn build` - Build all applications
- `yarn test` - Run all tests
- `yarn lint` - Lint all code
- `yarn typecheck` - Run TypeScript checks across all apps

### App-specific commands
- `cd apps/ui && yarn dev` - Start UI only on port 8080
- `cd apps/api && yarn dev` - Start API development server
- `cd apps/mana && yarn dev` - Start Mana relayer service

### Testing
- `yarn test` - Run all tests via Turbo
- `yarn test:integration` - Run integration tests
- `cd apps/ui && yarn test:watch` - Watch mode for UI tests

## Code style guidelines

### General rules
- **IMPORTANT**: Remove console.log statements
- Avoid code duplication - extract reusable functions/components
- Use "Sentence case" for texts and titles in UI, not "Title Case"
- Use official casing for trademarks: WalletConnect, GitHub (not Wallet Connect, Github)
- Simpler is better, avoid adding extra complexity
- The less code you use the better
- **ALWAYS** add types in your code
- Use ES modules (import/export) syntax throughout
- Destructure imports when possible
- Use TypeScript strictly - no `any` types
- Use `camelCase` for variables and functions, `PascalCase` for components/classes

### Vue/UI specific
- Use Composition API with `<script setup>` syntax
- Components use PascalCase naming (e.g., `MyComponent.vue`)
- Use `defineProps`, `defineEmits`, `defineSlots` for component APIs
- Prefer `toRef`, `toRefs` for reactive prop handling
- Use `MaybeRefOrGetter` types for composable inputs
- Store composables in `src/composables/`, queries in `src/queries/`
- Follow vue-query conventions - see `docs/vue-query.md`

### TypeScript
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper generic constraints
- No explicit `any` - use `unknown` if needed

## Project structure

```
apps/
├── ui/           # Vue 3 frontend application
│   ├── src/
│   │   ├── components/   # Vue components
│   │   ├── composables/  # Vue composables
│   │   ├── queries/      # Vue Query composables
│   │   ├── helpers/      # Utility functions
│   │   ├── networks/     # Blockchain network logic
│   │   ├── views/        # Page components
│   │   └── stores/       # Pinia stores
├── api/          # GraphQL API server
│   └── src/
│       ├── evm/          # Ethereum Virtual Machine logic
│       └── starknet/     # Starknet blockchain logic
└── mana/         # Blockchain relayer service
    └── src/
        ├── eth/          # Ethereum logic
        └── stark/        # Starknet logic
```

## Environment setup

### Required environment variables

For `apps/mana/.env`:
- `WALLET_SECRET` - Private key for relayer wallet
- `HERODOTUS_API_KEY` - For L1<->L2 messaging
- `HERODOTUS_LEGACY_API_KEY` - Legacy API access

For `apps/api/.env`:
- Copy from `.env.example` and fill required values

### Development dependencies
- Node.js ≥22.6
- Yarn 1.22.19
- Docker (for PostgreSQL)

## Workflow guidelines

### Before making changes
1. **ALWAYS** run `yarn typecheck` after code changes
2. Run `yarn lint` to check code style
3. Prefer running single tests during development
4. Use `yarn dev:interactive` to run only needed services

### Testing strategy
- Use Vitest for unit testing
- UI tests use Vue Test Utils with Happy DOM
- Integration tests cover full workflows
- Test files use `.test.ts` extension

### Git workflow
- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification
- Use prefixes: `feat:`, `fix:`, `refactor:` in commit messages and PR titles
- All code must pass CI checks (lint, typecheck, test)
- Integration tests must pass before merge

### Pull request guidelines
- **Changes**: Briefly describe changes in PR description
- **Screenshots**: Include screenshots or Loom recording for UI changes
- **Issue linking**: Link PR to one issue only, create separate PRs for multiple issues  
- **Size**: Break large PRs into smaller, reviewable chunks
- **Testing**: Clearly outline how to test changes, include edge cases
- **Types**: Ensure all code has proper TypeScript types

### Code review guidelines
- Use review abbreviations:
  - **cACK** (Concept ACK): Agree with concept, haven't reviewed code
  - **utACK** (Untested ACK): Reviewed code, haven't tested
  - **tACK** (Tested ACK): Reviewed and tested changes
- Provide constructive, precise feedback
- Always try to test changes, use utACK as last resort
- Propose ways to make code simpler and smaller

## Technology stack

### Frontend (UI)
- **Vue 3** with Composition API
- **TypeScript** for type safety
- **Vite** for build tooling
- **TailwindCSS** for styling
- **Vue Query (TanStack)** for data fetching
- **Pinia** for state management
- **Vue Router** for routing

### Backend (API)
- **Apollo Server** for GraphQL
- **Checkpoint** for blockchain indexing ([checkpoint-labs/checkpoint](https://github.com/checkpoint-labs/checkpoint))
- **TypeScript** and Node.js

### Blockchain
- **Ethereum** and **Starknet** support
- **ethers.js** for Ethereum interactions
- **starknet.js** for Starknet interactions

### Development tools
- **Turborepo** for monorepo management
- **ESLint** with `@snapshot-labs` config
- **Prettier** for code formatting
- **Vitest** for testing
- **Histoire** for component documentation

## Important notes

### Performance considerations
- UI app uses code splitting and lazy loading
- GraphQL queries use proper caching strategies
- Large lists implement virtualization where needed

### Blockchain specifics
- Local development uses Sepolia testnets only
- Relayer service requires funded wallet for gas
- L1<->L2 messaging needs Herodotus API access

### Debugging
- Use `yarn dev:debug` for API debugging with inspector
- Frontend has Vue DevTools support
- Check browser network tab for GraphQL queries

## Quick start for new contributors

1. Clone and install: `yarn`
2. Set up environment files from `.env.example`
3. Start development: `yarn dev:interactive`
4. Run tests: `yarn test`
5. Check types: `yarn typecheck`

**YOU MUST** always run `yarn typecheck` and `yarn lint` before committing changes.
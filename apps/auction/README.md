# Auction

![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fauction%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)

Vue 3 frontend for the Brokester auction app, built on top of Gnosis-style batch auctions.

Auction data is read from per-network subgraphs. Bid signing/submission is on-chain (EVM only). Referral data and partner attestations go through the Brokester API.

## Apps

- Networks: `eth`, `base`, `sep`
- Routes: `/` (auction list), `/auction/:network:id` (detail), `/auction/upcoming/:id`, `/auction/invite/:tag/:partner`, `/auction/verify`

## Commands

```bash
bun run dev          # Vite dev server on port 8081
bun run build        # Production build
bun run typecheck    # vue-tsc
bun run lint         # ESLint
bun run test         # Vitest
bun run codegen      # Regenerate GraphQL types from subgraph + Brokester API
```

## Configuration

Environment variables (see [`.env`](.env)):

| Var                       | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `VITE_BROKESTER_API_URL`  | Referral / partner statistics endpoint   |
| `VITE_ATTESTATION_URL`    | Verification attestation service         |
| `VITE_MANA_URL`           | Relayer for `sendAuctionPartner`         |
| `VITE_IPFS_GATEWAY`       | IPFS gateway for token logos             |
| `VITE_INFURA_API_KEY`     | EVM RPC fallback                         |
| `VITE_ALCHEMY_API_KEY`    | EVM RPC fallback                         |
| `VITE_ETHERSCAN_API_KEY`  | Explorer URL helpers                     |
| `VITE_WC_PROJECT_ID`      | WalletConnect project ID                 |
| `VITE_ENVELOP_URL`        | Sumsub verification webhook              |
| `VITE_ENABLED_NETWORKS`   | Comma-separated subset of `eth,base,sep` (defaults to all) |

## Source layout

```
src/
  components/    Auto-imported Vue components (directory-as-namespace)
  composables/   Auto-imported composition functions
  helpers/
    auction/     Subgraph queries, contracts, orders, referral, verification
  networks/      Minimal EVM network metadata
  queries/       TanStack Query composables (auction + referral)
  routes/        Vue Router (hash mode)
  stores/        Pinia stores
  views/         Page-level views
```

For development conventions, auto-imports, and styling rules, see [AGENTS.md](./AGENTS.md).

## Tests

```bash
bun run test
```

Order encoding/decoding logic is covered in [`src/helpers/auction/orders.test.ts`](./src/helpers/auction/orders.test.ts).

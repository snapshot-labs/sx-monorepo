[![Test CI](https://github.com/snapshot-labs/sx-monorepo/actions/workflows/test.yml/badge.svg)](https://github.com/snapshot-labs/sx-monorepo/actions/workflows/test.yml)
[![Discord](https://img.shields.io/discord/707079246388133940.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.snapshot.org/)

# Snapshot monorepository

This is the Snapshot monorepository containing a Vue frontend, GraphQL API, a transaction relayer, and a TypeScript SDK.

## Apps and packages

- [`./apps/ui`](./apps/ui): Snapshot official frontend using Vue 3 ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fui%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./apps/auction`](./apps/auction): Brokester auction frontend using Vue 3 ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fauction%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./apps/api`](./apps/api): Multichain indexer for Snapshot X using [Checkpoint](https://checkpoint.box) ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fapi%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./apps/hub`](./apps/hub): Hub for Snapshot network that stores and signs messages ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fhub%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./apps/highlight`](./apps/highlight) ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fhighlight%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./apps/mana`](./apps/mana): Transaction relayer for gasless voting on Snapshot X ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fmana%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./apps/mcp`](./apps/mcp): MCP server for the Snapshot API ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fmcp%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./apps/sequencer`](./apps/sequencer) ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fsequencer%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./packages/sx.js`](./packages/sx.js): TypeScript SDK for Snapshot and Snapshot X ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dpackages%2Fsx.js%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./packages/tune`](./packages/tune): Vue 3 UI kit for Snapshot apps ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dpackages%2Ftune%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)
- [`./packages/lock`](./packages/lock): Web3 connector library for Snapshot's Vue app ![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dpackages%2Flock%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)

# Usage

## Project setup

```
bun install
```

### Compiles and hot-reloads for development

#### UI only

```sh
bun run dev
```

This runs `ui` (port 8080). To run the auction app instead, use `bun run dev:interactive` and pick `Auction`, or run `turbo run dev --filter=auction` directly (port 8081).

#### UI with backend services

[See here.](./README.md#running-local-services)

### Compiles and minifies for production

```
bun run build
```

### Lints and fixes files

```
bun run lint
```

### Runs tests

```
bun run test
```

### Run E2E tests using Playwright

```
bun run test:e2e
```

### Verifies TypeScript code

```
bun run typecheck
```

## Running local services

You can run all local services (api, mana, ui) with single command assuming you have all necessary environment variables set up.
Local APIs will only be used for Ethereum Sepolia and Starknet Sepolia.

This command will allow you to select which services you want to run.

```
bun run dev:interactive
```

### Setup

You need to have Docker running on your machine.

In `apps/api` and `apps/mana` copy `.env.example` to `.env` files.

In `apps/mana/.env` you need to fill in following empty variables:

- `WALLET_SECRET` - if you want to use it as relayer (used for both Starknet and Ethereum wallets).
- `HERODOTUS_API_KEY` and `HERODOTUS_LEGACY_API_KEY` - if you want to use L1<->L2 messaging (voting with strategies that use L1 proofs)

### Getting it running faster

If you run `bun run dev:interactive` it will take long time to sync all the blocks for the first time. To mitigate it you can just change starting block
for indexing here:

- https://github.com/snapshot-labs/sx-monorepo/blob/daad48dbd2aa775e47334d0697cb84477c1d3427/apps/api/src/starknet/config.ts#L40 (for Starknet)
- https://github.com/snapshot-labs/sx-monorepo/blob/9f5c78468c72e0ddd51578bdd984cc9da19f119a/apps/api/src/evm/config.ts#L23 (for Ethereum)

If you do that make sure to create a new space, because spaces created before the new starting block you picked won't be available.

## Versioning packages

Packages are versioned using [`changesets`](https://github.com/changesets/changesets).
In most cases all you need to do is when adding new changes to versioned packages (right now it's just `sx.js`)
is to execute `bun run changeset`, specify package you updated, version bump per [semver](https://semver.org/) and description of your changes.
Then commit generated files in your PR.

Once merged changesets actions will create PR that can be used to release and publish those packages.

## Development docs

- [Using `vue-query` to fetch data](./docs/vue-query.md)

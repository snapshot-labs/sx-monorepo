[![Test CI](https://github.com/snapshot-labs/sx-monorepo/actions/workflows/test.yml/badge.svg)](https://github.com/snapshot-labs/sx-monorepo/actions/workflows/test.yml)
[![Discord](https://img.shields.io/discord/707079246388133940.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.snapshot.org/)

# Snapshot X monorepository

This is an Snapshot X monorepository.

## Apps and Packages

- `ui`: Snapshot X front-end written in Vue

# Usage

## Project setup

```
yarn
```

### Compiles and hot-reloads for development

#### UI only

```sh
yarn dev
```

#### UI with backend services

[See here.](./README.md#running-local-services)

### Compiles and minifies for production

```
yarn build
```

### Lints and fixes files

```
yarn lint
```

### Runs tests

```
yarn test
```

### Verifies TypeScript code

```
yarn typecheck
```

## Running local services

You can run all local services (api, mana, ui) with single command assuming you have all necessary environment variables set up.
Local APIs will only be used for Ethereum Sepolia and Starknet Sepolia.

This command will allow you to select which services you want to run.

```
yarn dev:interactive
```

### Setup

You need to have Docker running on your machine.

In `apps/api` and `apps/mana` copy `.env.example` to `.env` files.

In `apps/mana/.env` you need to fill in following empty variables:

- `WALLET_SECRET` - if you want to use it as relayer (used for both Starknet and Ethereum wallets).
- `HERODOTUS_API_KEY` and `HERODOTUS_LEGACY_API_KEY` - if you want to use L1<->L2 messaging (voting with strategies that use L1 proofs)

### Getting it running faster

If you run `yarn dev:interactive` it will take long time to sync all the blocks for the first time. To mitigate it you can just change starting block
for indexing here:

- https://github.com/snapshot-labs/sx-monorepo/blob/daad48dbd2aa775e47334d0697cb84477c1d3427/apps/api/src/starknet/config.ts#L40 (for Starknet)
- https://github.com/snapshot-labs/sx-monorepo/blob/9f5c78468c72e0ddd51578bdd984cc9da19f119a/apps/api/src/evm/config.ts#L23 (for Ethereum)

If you do that make sure to create a new space, because spaces created before the new starting block you picked won't be available.

## Versioning packages

Packages are versioned using [`changesets`](https://github.com/changesets/changesets).
In most cases all you need to do is when adding new changes to versioned packages (right now it's just `sx.js`)
is to execute `yarn changeset`, specify package you updated, version bump per [semver](https://semver.org/) and description of your changes.
Then commit generated files in your PR.

Once merged changesets actions will create PR that can be used to release and publish those packages.

## Development docs

- [Using `vue-query` to fetch data](./docs/vue-query.md)

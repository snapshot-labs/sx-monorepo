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

```sh
yarnh dev

# if you want to run full stack (including backend services)
yarn dev:full
```

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

## Versioning packages

Packages are versioned using [`changesets`](https://github.com/changesets/changesets).
In most cases all you need to do is when adding new changes to versioned packages (right now it's just `sx.js`)
is to execute `yarn changeset`, specify package you updated, version bump per [semver](https://semver.org/) and description of your changes.
Then comit generated files in your PR.

Once merged changesets actions will create PR that can be used to release and publish those packages.

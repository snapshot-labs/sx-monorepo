![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dpackages%2Fsx.js%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)

# SX.js

TypeScript SDK for Snapshot, Snapshot X and Governor.

### Running integration tests

Tests are run using [`anvil`](https://book.getfoundry.sh/reference/anvil/) and [`starknet-devnet`](https://0xspaceshard.github.io/starknet-devnet/) local nodes and you need to have them available before running.

## Running sx-evm tests

You need to have `anvil` running to run `sx-evm` tests.
Start it using `bun run node:evm`.

```
bun run test:integration:evm
```

## Running sx-starknet tests

You need to have both `anvil` and `starknet-devnet` running to run `sx-evm` tests.
Start them using `bun run node:evm` and `bun run node:starknet`.

```
bun run test:integration:starknet
```

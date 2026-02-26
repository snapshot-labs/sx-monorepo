# sx.js

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

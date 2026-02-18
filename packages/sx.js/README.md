# sx.js

Snapshot X TypeScript SDK for governance protocols.

## Features

### Offchain Actions

The package includes actions for interacting with offchain Snapshot spaces:

#### Get Space Controller

Retrieve the controller address for an offchain Snapshot space. Supports ENS, Shibarium (.shib), and Sonic (.sonic) domains.

```typescript
import { clients } from '@snapshot-labs/sx';
import { providers } from '@ethersproject/providers';

const provider = new providers.JsonRpcProvider('https://rpc.ankr.com/eth');

const controller = await clients.offchainActions.getSpaceController({
  spaceId: 'snapshot.eth',
  networkId: 's', // 's' for mainnet, 's-tn' for testnet
  provider
});
```

See [packages/sx.js/src/clients/offchain/actions/README.md](./src/clients/offchain/actions/README.md) for detailed documentation and examples.

### Running integration tests

Tests are run using [`anvil`](https://book.getfoundry.sh/reference/anvil/) and [`starknet-devnet`](https://0xspaceshard.github.io/starknet-devnet/) local nodes and you need to have them available before running.

## Running sx-evm tests

You need to have `anvil` running to run `sx-evm` tests.
Start it using `yarn node:evm`.

```
yarn test:integration:evm
```

## Running sx-starknet tests

You need to have both `anvil` and `starknet-devnet` running to run `sx-evm` tests.
Start them using `yarn node:evm` and `yarn node:starknet`.

```
yarn test:integration:starknet
```

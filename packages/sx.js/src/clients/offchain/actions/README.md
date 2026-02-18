# Offchain Actions

This module provides actions for interacting with offchain Snapshot spaces.

## getSpaceController

Retrieves the controller address for an offchain Snapshot space. The controller is the address that has permission to manage the space settings.

### Usage

```typescript
import { clients } from '@snapshot-labs/sx';
import { providers } from '@ethersproject/providers';

// Create a provider for the appropriate network
const provider = new providers.JsonRpcProvider('https://rpc.ankr.com/eth');

// Get the space controller
const controller = await clients.offchainActions.getSpaceController({
  spaceId: 'vitalik.eth',
  networkId: 's', // 's' for mainnet, 's-tn' for testnet
  provider
});

console.log('Space controller:', controller);
// Output: Space controller: 0x1234...
```

### Supported Domain Types

The function supports multiple domain name systems:

#### ENS Domains (.eth and others)
For ENS domains, the function:
1. First checks for a `snapshot` text record on the ENS domain
2. If the text record contains an address, uses that as the controller
3. Otherwise, falls back to the ENS domain owner

```typescript
// Example with ENS domain
const controller = await clients.offchainActions.getSpaceController({
  spaceId: 'snapshot.eth',
  networkId: 's',
  provider: ethProvider
});
```

#### Shibarium Domains (.shib)
For Shibarium domains, returns the owner from the Shibarium registry.

```typescript
// Example with .shib domain
const controller = await clients.offchainActions.getSpaceController({
  spaceId: 'mydao.shib',
  networkId: 's',
  provider: shibariumProvider
});
```

#### Sonic Domains (.sonic)
For Sonic domains, returns the owner from Unstoppable Domains on the Sonic network.

```typescript
// Example with .sonic domain
const controller = await clients.offchainActions.getSpaceController({
  spaceId: 'mydao.sonic',
  networkId: 's',
  provider: sonicProvider
});
```

### Parameters

- `spaceId` (string): The space ID (domain name) to fetch the controller for
- `networkId` ('s' | 's-tn'): The network ID ('s' for mainnet, 's-tn' for testnet)
- `provider` (Provider): An ethers.js provider for the appropriate chain

### Return Value

Returns a Promise that resolves to a string containing the controller address.

### Notes

- Make sure to use the correct provider for the domain type:
  - ENS: Ethereum mainnet (chainId: 1) or Sepolia (chainId: 11155111)
  - Shibarium: Shibarium mainnet (chainId: 109) or testnet (chainId: 157)
  - Sonic: Sonic network (chainId: 146)
- The function will throw an error if the domain type is not supported on the specified network

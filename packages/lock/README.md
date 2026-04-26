# @snapshot-labs/lock

Web3 connector library for Snapshot's Vue app. It bundles concrete
implementations for common wallets (injected, WalletConnect, Coinbase,
Safe, Sequence, Argent X, Unicorn) plus a `Guest` connector and an
EIP-6963 provider discovery helper used internally by the Vue composable.

Heavy wallet SDKs are loaded on demand inside each connector's
`connect()` method, so consumers only pay the download cost for the
connector the user actually picks.

## Usage

### Vue

```ts
import { useLock, ConnectorDetail } from '@snapshot-labs/lock/vue';
import type { ConnectorType } from '@snapshot-labs/lock';

const CONNECTOR_DETAILS: Record<ConnectorType, ConnectorDetail> = {
  injected: {},
  walletconnect: { info: { name: 'WalletConnect' }, options: { projectId: '...' } }
  // ...
};

const { connectors } = useLock(CONNECTOR_DETAILS);
```

`useLock` handles EIP-6963 discovery of injected wallets and returns a
reactive list of instantiated connectors ready for login flows.

The package root currently exposes only the shared `Connector` and
`ConnectorType` types:

```ts
import type { Connector, ConnectorType } from '@snapshot-labs/lock';
```

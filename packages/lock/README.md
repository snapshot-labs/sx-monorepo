# @snapshot-labs/lock

Web3 connector library. Bundles a base `Connector` class, concrete
implementations for common wallets (injected, WalletConnect, Coinbase,
Safe, Sequence, Argent X, Unicorn) and a `Guest` connector backed by
`GuestProvider`, plus an EIP-6963 provider discovery helper.

Heavy wallet SDKs are loaded on demand inside each connector's
`connect()` method, so consumers only pay the download cost for the
connector the user actually picks.

## Usage

```ts
import { connectors } from '@snapshot-labs/lock';

const walletconnect = new connectors.walletconnect({
  id: 'walletconnect',
  type: 'walletconnect',
  info: { name: 'WalletConnect' },
  options: { projectId: '...' },
  provider: undefined,
  autoConnectOnly: false
});

await walletconnect.connect();
```

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

# @snapshot-labs/lock

![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dpackages%2Flock%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)

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

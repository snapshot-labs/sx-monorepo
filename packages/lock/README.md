# @snapshot-labs/lock

Framework-agnostic web3 connector library used by Snapshot apps.

Exposes a base `Connector` class, connector implementations (injected,
WalletConnect, Coinbase, Safe, Sequence, Argent X, Unicorn, Guest),
the `GuestProvider`, and an EIP-6963 provider discovery helper.

Heavy wallet SDKs are loaded on demand inside each connector's `connect()`
method, so consumers only pay the download cost for the connector the user
actually picks.

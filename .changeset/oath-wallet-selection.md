---
'@snapshot-labs/lock': minor
---

Support multiple named connector choices per connector type and an optional native wallet preset for the WalletConnect connection screen. Existing single-connector configurations and generic WalletConnect selection remain supported.

WalletConnect waits for an Ethereum provider, restores an already-available provider during automatic reconnection, and releases event listeners and the reconnect timer when an attempt settles.

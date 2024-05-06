# @snapshot-labs/sx

## 0.1.2

### Patch Changes

- 0cef521: add proposal edition support to OffchainEthereumSig
- 7703dde: add cancel proposal support to OffchainEthereumSig
- 423f71a: migrate to new herodotus indexer
- ff6f988: add approval and single choice vote support to OffchainEthereumSig
- e456b85: add space param to offchain voting power strategies
- 7b37a7f: change default decimals for remote-vp strategy to 18
- ca99550: add evmOptimism network
- 423f71a: throw VotingPowerDetailsError in herodotus strategies with NOT_READY_YET memo
- 7fdabfe: remove strings and words64 utils
- 5db3101: add weighted and quadratic vote support for OffchainEthereumSig
- f72f4d7: add deployL1AvatarExecution function to StarknetTx
- bb1234d: add getOffchainStrategy function for computing voting power
- 5be2175: add ranked choice vote support for OffchainEthereumSig

## 0.1.1

### Patch Changes

- 827b7b3: add OffchainEthereumSig client with basic vote support
- ddcdc7f: use clientConfig.ethUrl instead of predefined RPC APIs for starknet strategies

## 0.1.0

### Patch Changes

- 1c46f5d: add evmNetworks mapping

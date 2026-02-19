# @snapshot-labs/sx

## 0.1.10

### Patch Changes

- 486e3d9: Add gasless execution support for Governor
- d4a1f44: Add hasNonNativeBlockNumbers to EvmNetworkConfig
- 046eed3: add GovernorBravo client
- ba0cc5c: Accept descriptionHash in OpenZeppelinEthereumTx client instead of description
- 2111bc3: add Transaction types to sx.js
- 3a10211: use dedicated client for offchain starknet-sig, and support SNIP-12
- 1edeac7: do not use toLocaleLowerCase for addresses
- 32e122f: Add blockTime to EvmNetworkConfig
- 2111bc3: add governor execution utils for decoding transactions
- 59a0c07: add OpenZeppelinEthereumTx client

## 0.1.9

### Patch Changes

- 5429684: Call get_voting_power in storage proof strategies to verify Slot is zero is not thrown
- bd2cc25: convert params for getVotingPower check in storage slot proof strategies

## 0.1.8

### Patch Changes

- 0bf0a22: use whitelist server to compute EVM merkleWhitelist proof
- 4ada1f3: generate standard execution payload for any execution with transactions
- abb0940: relax voter and proposal author type to allow starknet address
- 0bf0a22: require params to be included in EMV strategies for propose and vote
- 9f5c784: add Apechain and Curtis networks
- 7ae0363: use whitelistServer instead of mana for whitelist proofs

## 0.1.7

### Patch Changes

- 7bfd971: Add privacy option to proposal and update-proposal
- 2add7c2: add space creation support to OffchainEthereumSig
- f08f273: Add new voting type copeland
- 5ebcc3c: add flagProposal method to offchain EthereumSig client
- 88a6f85: fetch merkletree proof from Mana https://github.com/snapshot-labs/sx-monorepo/pull/1176
- 5bcc748: encrypt only shutter votes
- 302cd7a: add Mantle network support

## 0.1.6

### Patch Changes

- 7a85ef3: Remove extraneous logs

## 0.1.5

### Patch Changes

- ce35884: fix evm slot value strategy cached_timestamps lookup
- e4ccc72: remove networks with empty config
- 1bbd2c3: set ethsig offchain vote app property
- 94652af: disable estimation for initialize EthTx calls
- cc81127: Use `address` instead of `signer` for following methods in Starknet EthereumTx client: `estimateProposeFee`, `estimateVoteFee`, `estimateUpdateProposalFee`, `getProposeHash`, `getVoteHash`, `getUpdateProposalHash`.
- 4627095: add updateSettings method to offchain EthereumSig client
- 797f5e3: Support labels on proposals
- aa87e0c: add deleteSpace method to offchain ethSig client
- ef1429d: fix ethSig updateProposal call to properly include author

## 0.1.4

### Patch Changes

- 9e4e6ea: support submitting a reason when voting
- 1dc22d8: handle storage proof slot being zero

## 0.1.3

### Patch Changes

- bc7102e: add updateUser to OffchainEthereumSig
- 9c23d46: use contract to map timestamp to block number in storage proof strategies instead of API
- e088ca6: add domain and types to starknet/starknet-sig envelope
- f49adac: add Axiom and Isokratia strategies to execution strategies instead of voting strategies
- e088ca6: always return padded addresses in starknet/starknet-sig envelope
- 76f59c6: overestimate fee when using nonce in StarknetTx client
- bde32f6: support on-chain voting with Safe using relayer
- b603a6e: add nonce management to execute call
- b603a6e: remove deploy method from L1Executor
- bdd30ea: add space follow and unfollow support for OffchainEthereumSig
- 480d578: add support for statement edition when aliased from a starknet account
- e088ca6: add support for sending starknet signed message to offchain/ethereum-sig
- f525474: add feeEstimateOverride to networkConfig
- 6c95391: add updateStatement to offchain ethereum-sig
- 7c922d4: update EthRelayer to work with latest contracts
- ffb185d: add setAlias to OffchainEthereumSig
- e088ca6: add setAlias to starknet/starknet-sig

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

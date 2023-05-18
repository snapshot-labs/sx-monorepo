[![codecov](https://codecov.io/github/snapshot-labs/sx-evm/branch/main/graph/badge.svg?token=BZ4XKYU3FT)](https://app.codecov.io/gh/snapshot-labs/sx-evm)
[![ci](https://github.com/snapshot-labs/sx-evm/actions/workflows/ci.yml/badge.svg)](https://github.com/snapshot-labs/sx-evm/actions/workflows/ci.yml)

# Snapshot X

An EVM implementation of the Snapshot X Protocol. Refer to the [documentation](https://docs.snapshotx.xyz) for more
information.

## Contracts Blueprint

```ml
src
├─ authenticators
│  ├─ Authenticator.sol - "Base Authenticator contract"
│  ├─ EthSigAuthenticator.sol - "Strategy that authenticates users via an EIP712 signature"
│  ├─ EthTxAuthenticator.sol - "Strategy that authenticates users via checking the tx sender address"
│  └─ VanillaAuthenticator.sol — "Vanilla Strategy"
├─ voting-strategies
│  ├─ CompVotingStrategy.sol - "Strategy that uses delegated balances of Comp tokens as voting power"
│  ├─ OZVotesVotingStrategy.sol - "Strategy that uses delegated balances of OZ Votes tokens as voting power"
│  ├─ WhitelistVotingStrategy.sol — "Strategy that gives predetermined voting power for members in a whitelist, otherwise zero"
│  └─ VanillaVotingStrategy.sol — "Vanilla Strategy"
├─ execution-strategies
│  ├─ AvatarExecutionStrategy.sol - "Strategy that allows proposal transactions to be executed from an Avatar contract"
│  ├─ TimelockExecutionStrategy.sol - "Strategy that can be used to execute proposal transactions according to a timelock delay"
│  ├─ CompTimelockCompatibleExecutionStrategy.sol - "Strategy that provides compatibility with existing Comp Timelock contracts"
│  ├─ EmergencyQuorumExecutionStrategy.sol - "Base Strategy that uses an additional Emergency Quorum to determine the status of a proposal"
│  ├─ OptimisticQuorumExecutionStrategy.sol - "Base Strategy that uses an Optimistic Quorum to determine the status of a proposal"
│  ├─ SimpleQuorumExecutionStrategy.sol - "Base Strategy that uses a Simple Quorum to determine the status of a proposal"
│  └─ VanillaExecutionStrategy.sol - "Vanilla Strategy"
├─ interfaces
│  ├─ ...
├─ proposal-validation-strategies
│  ├─ ActiveProposalsLimiterProposalValidationStrategy.sol - "Strategy to that validates with the ActiveProposalsLimiter module"
│  ├─ PropositionPowerAndActiveProposalsLimiterProposalValidationStrategy.sol - "Strategy that validates with the ActiveProposalsLimiter and PropositionPower modules"
│  └─ PropositionPowerProposalValidationStrategy.sol - "Strategy that validates with the PropositionPower module"
├─ utils
│  ├─ ActiveProposalsLimiter.sol - "Module to limit the number of active proposals per author"
│  ├─ BitPacker.sol - "Uint256 Bit Setting and Checking Library"
│  ├─ PropositionPower.sol - "Module that checks proposal authors exceed a threshold proposition power over a set of strategies"
│  ├─ SXHash.sol - "Snapshot X Types Hashing Library"
│  ├─ SXUtils.sol - "Snapshot X Types Utilities Library"
│  ├─ SignatureVerifier.sol - "Verifies EIP712 Signatures for Snapshot X actions"
│  ├─ SpaceManager.sol - "Manages a whitelist of Spaces that have permissions to execute transactions"
│  └─ TimestampResolver.sol - "Resolves timestamps to block numbers"
├─ ProxyFactory.sol - "Handles the deployment and tracking of Space contracts"
└─ Space.sol - "The base contract for each Snapshot X space"
└─ types.sol - "Definitions for Snapshot X custom types"
```

## Usage

### Build

Build the contracts:

```sh
$ forge build
```

### Test

Run the tests:

```sh
$ forge test
```

### Coverage

Get a test coverage report:

```sh
$ forge coverage
```

# OpenZeppelin integration

This protocol supports [OpenZeppelin governor contracts](https://docs.openzeppelin.com/contracts/5.x/api/governance).

OpenZeppelin governance contracts are modular and some functionality is implemented in separate contracts.

This protocol provides implementations for the following OpenZeppelin governance modules:

- [`GovernorVotes`](https://docs.openzeppelin.com/contracts/5.x/api/governance#GovernorVotes)
- [`GovernorVotesQuorumFraction`](https://docs.openzeppelin.com/contracts/5.x/api/governance#GovernorVotesQuorumFraction)
- [`GovernorCountingSimple`](https://docs.openzeppelin.com/contracts/5.x/api/governance#GovernorCountingSimple)
- [`GovernorTimelockControl`](https://docs.openzeppelin.com/contracts/5.x/api/governance#GovernorTimelockControl)
- [`GovernorSettings`](https://docs.openzeppelin.com/contracts/5.x/api/governance#GovernorSettings)

Support for other modules need to be implemented when integrating new governances.

This integration expects ERC-6372 clock to be set to blocks.

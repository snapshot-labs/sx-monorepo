// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

struct Proposal {
    // notice: `uint32::max` corresponds to year ~2106.
    uint32 snapshotTimestamp;
    // * The same logic applies for why we store the 3 timestamps below (which could otherwise
    // be inferred from the votingDelay, minVotingDuration, and maxVotingDuration state variables)
    uint32 startTimestamp;
    uint32 minEndTimestamp;
    uint32 maxEndTimestamp;
    // The hash of the execution payload. We do not store the payload itself to save gas.
    bytes32 executionPayloadHash;
    // Struct containing the execution strategy address and parameters required for the strategy.
    Strategy executionStrategy;
    address author;
    // An enum that stores whether a proposal is pending, executed, or cancelled.
    FinalizationStatus finalizationStatus;
    // Array of structs containing the voting strategy addresses and parameters required for each.
    Strategy[] votingStrategies;
}

struct Strategy {
    address addy;
    bytes params;
}

struct IndexedStrategy {
    uint8 index;
    bytes params;
}

enum FinalizationStatus {
    Pending,
    Executed,
    Cancelled
}

// The status of a proposal as defined by the `getProposalStatus` function of the
// proposal's execution strategy.
enum ProposalStatus {
    VotingDelay,
    VotingPeriod,
    VotingPeriodAccepted,
    Accepted,
    Executed,
    Rejected,
    Cancelled
}

enum Choice {
    Against,
    For,
    Abstain
}

struct Vote {
    Choice choice;
    uint256 votingPower;
}

struct MetaTransaction {
    address to;
    uint256 value;
    bytes data;
    Enum.Operation operation;
}

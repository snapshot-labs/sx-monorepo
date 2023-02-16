// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

struct Proposal {
    // We store the quroum for each proposal so that if the quorum is changed mid proposal,
    // the proposal will still use the previous quorum *
    uint256 quorum;
    // notice: `uint32::max` corresponds to year ~2106.
    uint32 snapshotTimestamp;
    // * The same logic applies for why we store the 3 timestamps below (which could otherwise
    // be inferred from the votingDelay, minVotingDuration, and maxVotingDuration state variables)
    uint32 startTimestamp;
    uint32 minEndTimestamp;
    uint32 maxEndTimestamp;
    bytes32 executionHash;
    address executionStrategy;
    FinalizationStatus finalizationStatus;
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

// An enum that stores whether a proposal is pending, executed, or cancelled.
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

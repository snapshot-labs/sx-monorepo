// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Enum } from "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import { IExecutionStrategy } from "src/interfaces/IExecutionStrategy.sol";

/// @notice The data stored for each proposal when it is created.
struct Proposal {
    // The timestamp at which voting power for the proposal is calculated. Overflows at year ~2106.
    uint32 snapshotTimestamp;
    // We store the following 3 timestamps for each proposal despite the fact that they can be
    // inferred from the votingDelay, minVotingDuration, and maxVotingDuration state variables
    // because those variables may be updated during the lifetime of a proposal.
    uint32 startTimestamp;
    uint32 minEndTimestamp;
    uint32 maxEndTimestamp;
    // The hash of the execution payload. We do not store the payload itself to save gas.
    bytes32 executionPayloadHash;
    // The address of execution strategy used for the proposal.
    IExecutionStrategy executionStrategy;
    // The address of the proposal creator.
    address author;
    // An enum that stores whether a proposal is pending, executed, or cancelled.
    FinalizationStatus finalizationStatus;
    // Bit array where the index of each each bit corresponds to whether the voting strategy.
    // at that index is active at the time of proposal creation.
    uint256 activeVotingStrategies;
}

/// @notice The data stored for each strategy.
struct Strategy {
    // The address of the strategy contract.
    address addr;
    // The parameters of the strategy.
    bytes params;
}

/// @notice The data stored for each indexed strategy.
struct IndexedStrategy {
    uint8 index;
    bytes params;
}

/// @notice The set of possible finalization statuses for a proposal.
///         This is stored inside each Proposal struct.
enum FinalizationStatus {
    Pending,
    Executed,
    Cancelled
}

/// @notice The set of possible statuses for a proposal.
enum ProposalStatus {
    VotingDelay,
    VotingPeriod,
    VotingPeriodAccepted,
    Accepted,
    Executed,
    Rejected,
    Cancelled
}

/// @notice The set of possible choices for a vote.
enum Choice {
    Against,
    For,
    Abstain
}

/// @notice Transaction struct that can be used to represent transactions inside a proposal.
struct MetaTransaction {
    address to;
    uint256 value;
    bytes data;
    Enum.Operation operation;
    // We require a salt so that the struct can always be unique and we can use its hash as a unique identifier.
    uint256 salt;
}

/// @dev    Structure used for the function `initialize` of the Space contract because of solidity's stack constraints.
///         For more information, see `ISpaceActions.sol`.
struct InitializeCalldata {
    address owner;
    uint32 votingDelay;
    uint32 minVotingDuration;
    uint32 maxVotingDuration;
    Strategy proposalValidationStrategy;
    string proposalValidationStrategyMetadataURI;
    string daoURI;
    string metadataURI;
    Strategy[] votingStrategies;
    string[] votingStrategyMetadataURIs;
    address[] authenticators;
}

/// @dev    Structure used for the function `updateSettings` of the Space contract because of solidity's stack constraints.
///         For more information, see `ISpaceOwnerActions.sol`.
struct UpdateSettingsCalldata {
    uint32 minVotingDuration;
    uint32 maxVotingDuration;
    uint32 votingDelay;
    string metadataURI;
    string daoURI;
    Strategy proposalValidationStrategy;
    string proposalValidationStrategyMetadataURI;
    address[] authenticatorsToAdd;
    address[] authenticatorsToRemove;
    Strategy[] votingStrategiesToAdd;
    string[] votingStrategyMetadataURIsToAdd;
    uint8[] votingStrategiesToRemove;
}

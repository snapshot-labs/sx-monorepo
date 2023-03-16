// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { IndexedStrategy, Proposal, Strategy, Choice } from "src/types.sol";

interface ISpaceEvents {
    event SpaceCreated(
        address space,
        address owner,
        uint32 votingDelay,
        uint32 minVotingDuration,
        uint32 maxVotingDuration,
        Strategy proposalValidationStrategy,
        string metadataURI,
        Strategy[] votingStrategies,
        string[] votingStrategyMetadataURIs,
        address[] authenticators,
        Strategy[] executionStrategies,
        string[] executionStrategyMetadataURIs
    );
    event ProposalCreated(uint256 nextProposalId, address author, Proposal proposal, string metadataUri, bytes payload);
    event VoteCast(uint256 proposalId, address voterAddress, Choice choice, uint256 votingPower);
    event VoteCastWithMetadata(
        uint256 proposalId,
        address voterAddress,
        Choice choice,
        uint256 votingPower,
        string metadataUri
    );
    event ProposalExecuted(uint256 proposalId);
    event ProposalCancelled(uint256 proposalId);
    event VotingStrategiesAdded(Strategy[] newVotingStrategies, string[] newVotingStrategyMetadataURIs);
    event VotingStrategiesRemoved(uint8[] votingStrategyIndices);
    event ExecutionStrategiesAdded(Strategy[] newExecutionStrategies, string[] newExecutionStrategyMetadataURIs);
    event ExecutionStrategiesRemoved(uint8[] executionStrategyIndices);
    event AuthenticatorsAdded(address[] newAuthenticators);
    event AuthenticatorsRemoved(address[] authenticators);
    event MaxVotingDurationUpdated(uint32 newMaxVotingDuration);
    event MinVotingDurationUpdated(uint32 newMinVotingDuration);
    event MetadataURIUpdated(string newMetadataURI);
    event ProposalValidationStrategyUpdated(Strategy newProposalValidationStrategy);
    event QuorumUpdated(uint256 newQuorum);
    event VotingDelayUpdated(uint256 newVotingDelay);
    event ProposalUpdated(uint256 proposalId, IndexedStrategy newExecutionStrategy, string newMetadataURI);
}

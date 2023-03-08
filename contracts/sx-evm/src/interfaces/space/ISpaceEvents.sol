// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { IndexedStrategy, Proposal, Strategy, Vote } from "src/types.sol";

interface ISpaceEvents {
    event SpaceCreated(
        address space,
        address owner,
        uint32 votingDelay,
        uint32 minVotingDuration,
        uint32 maxVotingDuration,
        uint256 proposalThreshold,
        string metadataURI,
        Strategy[] votingStrategies,
        string[] votingStrategyMetadataURIs,
        address[] authenticators,
        Strategy[] executionStrategies
    );
    event ProposalCreated(uint256 nextProposalId, address author, Proposal proposal, string metadataURI, bytes payload);
    event VoteCreated(uint256 proposalId, address voterAddress, Vote vote, string metadataURI);
    event ProposalExecuted(uint256 proposalId);
    event ProposalCancelled(uint256 proposalId);
    event VotingStrategiesAdded(Strategy[] newVotingStrategies, string[] newVotingStrategyMetadataURIs);
    event VotingStrategiesRemoved(uint8[] indices);
    event ExecutionStrategiesAdded(Strategy[] executionStrategies);
    event ExecutionStrategiesRemoved(uint8[] executionStrategies);
    event AuthenticatorsAdded(address[] authenticators);
    event AuthenticatorsRemoved(address[] authenticators);
    event ControllerUpdated(address newController);
    event MaxVotingDurationUpdated(uint32 newMaxVotingDuration);
    event MinVotingDurationUpdated(uint32 newMinVotingDuration);
    event MetadataURIUpdated(string newMetadataURI);
    event ProposalThresholdUpdated(uint256 newProposalThreshold);
    event QuorumUpdated(uint256 newQuorum);
    event VotingDelayUpdated(uint256 newVotingDelay);
    event ProposalUpdated(uint256 proposalId, IndexedStrategy newStrategy, string newMetadataURI);
}

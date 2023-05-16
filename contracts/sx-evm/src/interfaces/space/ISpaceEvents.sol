// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { IndexedStrategy, Proposal, Strategy, Choice } from "src/types.sol";

/// @title Space Events
interface ISpaceEvents {
    /// @notice Emitted when a space is created.
    /// @param space The address of the space.
    /// @param owner The address of the space owner (controller).
    /// @param votingDelay The delay in seconds between the creation of a proposal and the start of voting.
    /// @param minVotingDuration The minimum duration of the voting period.
    /// @param maxVotingDuration The maximum duration of the voting period.
    /// @param proposalValidationStrategy  The strategy to use to validate a proposal,
    ///        consisting of a strategy address and an array of configuration parameters.
    /// @param metadataURI The metadata URI for the space.
    /// @param votingStrategies  The whitelisted voting strategies,
    ///        each consisting of a strategy address and an array of configuration parameters.
    /// @param votingStrategyMetadataURIs The metadata URIs for `votingStrategies`.
    /// @param authenticators The whitelisted authenticator addresses.
    event SpaceCreated(
        address space,
        address owner,
        uint32 votingDelay,
        uint32 minVotingDuration,
        uint32 maxVotingDuration,
        Strategy proposalValidationStrategy,
        string proposalValidationStrategyMetadataURI,
        string daoURI,
        string metadataURI,
        Strategy[] votingStrategies,
        string[] votingStrategyMetadataURIs,
        address[] authenticators
    );

    /// @notice Emitted when a proposal is created.
    /// @param proposalId The proposal id.
    /// @param author The address of the proposal creator.
    /// @param proposal The proposal data. Refer to the `Proposal` definition for more details.
    /// @param metadataUri The metadata URI for the proposal.
    /// @param payload The execution payload for the proposal.
    event ProposalCreated(uint256 proposalId, address author, Proposal proposal, string metadataUri, bytes payload);

    /// @notice Emitted when a vote is cast.
    /// @param proposalId The proposal id.
    /// @param voter The address of the voter.
    /// @param choice The vote choice (`For`, `Against`, `Abstain`).
    /// @param votingPower The voting power of the voter.
    event VoteCast(uint256 proposalId, address voter, Choice choice, uint256 votingPower);

    /// @notice Emitted when a vote is cast with metadata.
    /// @param proposalId The proposal id.
    /// @param voter The address of the voter.
    /// @param choice The vote choice (`For`, `Against`, `Abstain`).
    /// @param votingPower The voting power of the voter.
    /// @param metadataUri The metadata URI for the vote.
    event VoteCastWithMetadata(
        uint256 proposalId,
        address voter,
        Choice choice,
        uint256 votingPower,
        string metadataUri
    );

    /// @notice Emitted when a proposal is executed.
    /// @param proposalId The proposal id.
    event ProposalExecuted(uint256 proposalId);

    /// @notice Emitted when a proposal is cancelled.
    /// @param proposalId The proposal id.
    event ProposalCancelled(uint256 proposalId);

    /// @notice Emitted when a set of voting strategies are added.
    /// @param newVotingStrategies The new voting strategies,
    ///        each consisting of a strategy address and an array of configuration parameters.
    /// @param newVotingStrategyMetadataURIs The metadata URIs for `newVotingStrategies`.
    event VotingStrategiesAdded(Strategy[] newVotingStrategies, string[] newVotingStrategyMetadataURIs);

    /// @notice Emitted when a set of voting strategies are removed.
    /// @dev There must be at least one voting strategy left active.
    /// @param votingStrategyIndices The indices of the voting strategies to remove.
    event VotingStrategiesRemoved(uint8[] votingStrategyIndices);

    /// @notice Emitted when a set of authenticators are added.
    /// @param newAuthenticators The new authenticators addresses.
    event AuthenticatorsAdded(address[] newAuthenticators);

    /// @notice Emitted when a set of authenticators are removed.
    /// @param authenticators The authenticator addresses to remove.
    event AuthenticatorsRemoved(address[] authenticators);

    /// @notice Emitted when the maximum voting duration is updated.
    /// @param newMaxVotingDuration The new maximum voting duration.
    event MaxVotingDurationUpdated(uint32 newMaxVotingDuration);

    /// @notice Emitted when the minimum voting duration is updated.
    /// @param newMinVotingDuration The new minimum voting duration.
    event MinVotingDurationUpdated(uint32 newMinVotingDuration);

    /// @notice Emitted when the metadata URI for the space is updated.
    /// @param newMetadataURI The new metadata URI.
    event MetadataURIUpdated(string newMetadataURI);

    /// @notice Emitted when the DAO URI for the space is updated.
    /// @param newDaoURI The new DAO URI.
    event DaoURIUpdated(string newDaoURI);

    /// @notice Emitted when the proposal validation strategy is updated.
    /// @param newProposalValidationStrategy The new proposal validation strategy,
    ///        consisting of a strategy address and an array of configuration parameters.
    /// @param newProposalValidationStrategyMetadataURI The metadata URI for the proposal validation strategy.
    event ProposalValidationStrategyUpdated(
        Strategy newProposalValidationStrategy,
        string newProposalValidationStrategyMetadataURI
    );

    /// @notice Emitted when the voting delay is updated.
    /// @param newVotingDelay The new voting delay.
    event VotingDelayUpdated(uint256 newVotingDelay);

    /// @notice Emitted when a proposal is updated.
    /// @param proposalId The proposal id.
    /// @param newExecutionStrategy The new execution strategy,
    ///        consisting of a strategy address and an execution payload array.
    /// @param newMetadataURI The metadata URI for the proposal.
    event ProposalUpdated(uint256 proposalId, Strategy newExecutionStrategy, string newMetadataURI);
}

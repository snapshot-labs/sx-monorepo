// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Choice, IndexedStrategy, Strategy } from "src/types.sol";

/// @title Space Actions
/// @notice User focused actions that can be performed on a space.
interface ISpaceActions {
    /// @notice  Initializes a space proxy after deployment.
    /// @param   owner  The address of the space owner.
    /// @param   votingDelay  The delay between the creation of a proposal and the start of the voting period.
    /// @param   minVotingDuration  The minimum duration of the voting period.
    /// @param   maxVotingDuration  The maximum duration of the voting period.
    /// @param   proposalValidationStrategy  The strategy to use to validate a proposal,
    ///          consisting of a strategy address and an array of configuration parameters.
    /// @param   proposalValidationStrategyMetadataURI  The metadata URI for `proposalValidationStrategy`.
    /// @param   daoURI  The ERC4824 DAO URI for the space.
    /// @param   metadataURI  The metadata URI for the space.
    /// @param   votingStrategies  The whitelisted voting strategies,
    ///          each consisting of a strategy address and an array of configuration parameters.
    /// @param   votingStrategyMetadataURIs  The metadata URIs for `votingStrategies`.
    /// @param   authenticators The whitelisted authenticator addresses.
    function initialize(
        address owner,
        uint32 votingDelay,
        uint32 minVotingDuration,
        uint32 maxVotingDuration,
        Strategy memory proposalValidationStrategy,
        string memory proposalValidationStrategyMetadataURI,
        string memory daoURI,
        string memory metadataURI,
        Strategy[] memory votingStrategies,
        string[] memory votingStrategyMetadataURIs,
        address[] memory authenticators
    ) external;

    /// @notice  Creates a proposal.
    /// @param   author  The address of the proposal creator.
    /// @param   metadataURI  The metadata URI for the proposal.
    /// @param   executionStrategy  The execution strategy for the proposal,
    ///          consisting of a strategy address and an execution payload.
    /// @param   userProposalValidationParams  The user provided parameters for proposal validation.
    function propose(
        address author,
        string calldata metadataURI,
        Strategy calldata executionStrategy,
        bytes calldata userProposalValidationParams
    ) external;

    /// @notice  Casts a vote.
    /// @param   voter  The voter's address.
    /// @param   proposalId  The proposal id.
    /// @param   choice  The vote choice  (`For`, `Against`, `Abstain`).
    /// @param   userVotingStrategies  The strategies to use to compute the voter's voting power,
    ///          each consisting of a strategy index and an array of user provided parameters.
    /// @param   metadataURI  An optional metadata to give information about the vote.
    function vote(
        address voter,
        uint256 proposalId,
        Choice choice,
        IndexedStrategy[] calldata userVotingStrategies,
        string calldata metadataURI
    ) external;

    /// @notice  Executes a proposal.
    /// @param   proposalId  The proposal id.
    /// @param   executionPayload  The execution payload.
    function execute(uint256 proposalId, bytes calldata executionPayload) external;

    /// @notice  Updates the proposal execution strategy and metadata.
    /// @param   proposalId The id of the proposal to edit.
    /// @param   executionStrategy The new execution strategy.
    /// @param   metadataURI The new metadata URI.
    function updateProposal(
        address author,
        uint256 proposalId,
        Strategy calldata executionStrategy,
        string calldata metadataURI
    ) external;
}

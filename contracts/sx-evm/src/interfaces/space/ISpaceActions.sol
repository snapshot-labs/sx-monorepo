// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Choice, IndexedStrategy, Strategy, InitializeCalldata } from "src/types.sol";

/// @title Space Actions
/// @notice User focused actions that can be performed on a space.
interface ISpaceActions {
    /// @notice  Initializes a space proxy after deployment.
    /// @param   input  The space initialization parameters, Consists of:
    ///          owner  The address of the space owner.
    ///          votingDelay  The delay between the creation of a proposal and the start of the voting period.
    ///          minVotingDuration  The minimum duration of the voting period.
    ///          maxVotingDuration  The maximum duration of the voting period.
    ///          proposalValidationStrategy  The strategy to use to validate a proposal,
    ///             consisting of a strategy address and an array of configuration parameters.
    ///          proposalValidationStrategyMetadataURI  The metadata URI for `proposalValidationStrategy`.
    ///          daoURI  The ERC4824 DAO URI for the space.
    ///          metadataURI  The metadata URI for the space.
    ///          votingStrategies  The whitelisted voting strategies,
    ///             each consisting of a strategy address and an array of configuration parameters.
    ///          votingStrategyMetadataURIs  The metadata URIs for `votingStrategies`.
    ///          authenticators The whitelisted authenticator addresses.
    /// @dev A struct is used here because of solidity's stack constraints.
    function initialize(InitializeCalldata calldata input) external;

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

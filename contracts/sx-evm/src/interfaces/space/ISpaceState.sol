// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Choice, Proposal, ProposalStatus, FinalizationStatus, Strategy } from "src/types.sol";
import { IExecutionStrategy } from "src/interfaces/IExecutionStrategy.sol";

/// @title Space State
interface ISpaceState {
    /// @notice The maximum duration of the voting period.
    function maxVotingDuration() external view returns (uint32);

    /// @notice The minimum duration of the voting period.
    function minVotingDuration() external view returns (uint32);

    /// @notice A pointer to the next available voting strategy index.
    function nextProposalId() external view returns (uint256);

    /// @notice The delay between proposal creation and the start of the voting period.
    function votingDelay() external view returns (uint32);

    /// @notice Returns whether a given address is a whitelisted authenticator.
    function authenticators(address) external view returns (bool);

    /// @notice Returns the voting strategy at a given index.
    /// @param index The index of the voting strategy.
    /// @return addr The address of the voting strategy.
    /// @return params The parameters of the voting strategy.
    function votingStrategies(uint8 index) external view returns (address addr, bytes memory params);

    /// @notice The bit array of the current active voting strategies.
    /// @dev The index of each bit corresponds to whether the strategy at that index
    ///       in `votingStrategies` is active.
    function activeVotingStrategies() external view returns (uint256);

    /// @notice The index of the next available voting strategy.
    function nextVotingStrategyIndex() external view returns (uint8);

    /// @notice The proposal validation strategy.
    /// @return addr The address of the proposal validation strategy.
    /// @return params The parameters of the proposal validation strategy.
    function proposalValidationStrategy() external view returns (address addr, bytes memory params);

    /// @notice Returns the voting power of a choice on a proposal.
    /// @param proposalId The ID of the proposal.
    /// @param choice The choice of the voter.
    function votePower(uint256 proposalId, Choice choice) external view returns (uint256);

    /// @notice Returns whether a voter has voted on a proposal.
    /// @param proposalId The ID of the proposal.
    /// @param voter The address of the voter.
    function voteRegistry(uint256 proposalId, address voter) external view returns (bool);

    /// @notice Returns the proposal at a given ID.
    /// @dev Returns all zeros if the proposal does not exist.
    /// @param proposalId The ID of the proposal.
    /// @return author The address of the proposal author.
    /// @return snapshotTimestamp The timestamp of the proposal snapshot.
    ///         All Voting Power will be calculated at this timestamp.
    /// @return startTimestamp The timestamp of the start of the voting period.
    /// @return executionStrategy The address of the execution strategy used in the proposal.
    /// @return minEndTimestamp The timestamp of the minimum end of the voting period.
    /// @return maxEndTimestamp The timestamp of the maximum end of the voting period.
    /// @return finalizationStatus The finalization status of the proposal. See `FinalizationStatus`.
    /// @return executionPayloadHash The keccak256 hash of the execution payload.
    /// @return activeVotingStrategies The bit array of the active voting strategies for the proposal.
    function proposals(
        uint256 proposalId
    )
        external
        view
        returns (
            address author,
            uint32 snapshotTimestamp,
            uint32 startTimestamp,
            IExecutionStrategy executionStrategy,
            uint32 minEndTimestamp,
            uint32 maxEndTimestamp,
            FinalizationStatus finalizationStatus,
            bytes32 executionPayloadHash,
            uint256 activeVotingStrategies
        );

    /// @notice Returns the status of a proposal.
    /// @param proposalId The ID of the proposal.
    /// @return The status of the proposal. Refer to the `ProposalStatus` enum for more information.
    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus);
}

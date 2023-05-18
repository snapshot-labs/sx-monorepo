// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @title Space Errors
interface ISpaceErrors {
    /// @notice Thrown when an invalid minimum or maximum voting duration is supplied.
    error InvalidDuration(uint32 minVotingDuration, uint32 maxVotingDuration);

    /// @notice Thrown when an invalid empty array is supplied.
    error EmptyArray();

    /// @notice Thrown when two arrays which must be of equal length are not.
    error ArrayLengthMismatch();

    /// @notice Thrown when the caller is unauthorized to perform a certain action.
    error InvalidCaller();

    /// @notice Thrown when an invalid zero address is supplied
    error ZeroAddress();

    /// @notice Thrown when an invalid strategy index is supplied.
    error InvalidStrategyIndex(uint256 index);

    /// @notice Thrown if the number of voting strategies exceeds the limit (256).
    ///         Once this limit is reached, no more strategies can be added.
    error ExceedsStrategyLimit();

    /// @notice Thrown when one attempts to remove all voting strategies.
    ///         There must always be at least one active voting strategy.
    error NoActiveVotingStrategies();

    /// @notice Thrown if a proposal is invalid.
    error InvalidProposal();

    /// @notice Thrown if the caller is not a whitelisted authenticator.
    error AuthenticatorNotWhitelisted();

    /// @notice Thrown if a user attempts to vote twice on the same proposal.
    error UserAlreadyVoted();

    /// @notice Thrown if a user attempts to vote with no voting power.
    error UserHasNoVotingPower();

    /// @notice Thrown if a user attempts to vote when the voting period has not started.
    error VotingPeriodHasNotStarted();

    /// @notice Thrown if a user attempts to vote when the voting period has ended.
    error VotingPeriodHasEnded();

    /// @notice Thrown if a user attempts to finalize (execute or cancel) a proposal that has already been finalized.
    error ProposalFinalized();

    /// @notice Thrown if an author attempts to update their proposal after the voting delay has passed.
    error VotingDelayHasPassed();

    /// @notice Thrown if a new proposal did not pass the proposal validation strategy for the space.
    error FailedToPassProposalValidation();
}

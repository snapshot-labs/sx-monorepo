// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

interface ISpaceErrors {
    // Min duration should be smaller than or equal to max duration
    error InvalidDuration(uint32 minVotingDuration, uint32 maxVotingDuration);
    // Array is empty
    error EmptyArray();

    error InvalidCaller();
    // All strategy addresses must be != address(0).
    error InvalidStrategyAddress();
    error InvalidStrategyIndex(uint256 index);
    error ExceedsStrategyLimit();
    error NoActiveVotingStrategies();
    error InvalidProposal();
    error AuthenticatorNotWhitelisted(address auth);
    error InvalidExecutionStrategyIndex(uint256 index);
    error ExecutionStrategyNotWhitelisted();
    error ProposalAlreadyFinalized();
    error MinVotingDurationHasNotElapsed();
    error QuorumNotReachedYet();
    error UserHasAlreadyVoted();
    error UserHasNoVotingPower();
    error VotingPeriodHasEnded();
    error VotingPeriodHasNotStarted();
    error ProposalFinalized();
    error VotingDelayHasPassed();
    error FailedToPassProposalValidation();
}

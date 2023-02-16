// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "../../types.sol";

interface ISpaceErrors {
    // Min duration should be smaller than or equal to max duration
    error InvalidDuration(uint32 minVotingDuration, uint32 maxVotingDuration);
    // Array is empty
    error EmptyArray();

    // All voting strategies addresses must be != address(0).
    error InvalidVotingStrategyAddress();
    error InvalidVotingStrategyIndex(uint256 index);
    error InvalidProposal();
    error AuthenticatorNotWhitelisted(address auth);
    error ExecutionStrategyNotWhitelisted(address strategy);
    error ProposalThresholdNotReached(uint256 votingPower);
    error DuplicateFound(uint a, uint b);
    error ProposalAlreadyFinalized();
    error MinVotingDurationHasNotElapsed();
    error ExecutionHashMismatch();
    error QuorumNotReachedYet();
    error UserHasAlreadyVoted();
    error UserHasNoVotingPower();
    error InvalidProposalStatus(ProposalStatus status);
    error VotingPeriodHasEnded();
    error VotingPeriodHasNotStarted();
    error ProposalFinalized();
}

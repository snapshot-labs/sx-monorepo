// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IExecutionStrategy } from "../interfaces/IExecutionStrategy.sol";
import { FinalizationStatus, Proposal, ProposalStatus } from "../types.sol";
import { SpaceManager } from "../utils/SpaceManager.sol";

/// @title Optimistic Quorum Base Execution Strategy
abstract contract OptimisticQuorumExecutionStrategy is IExecutionStrategy, SpaceManager {
    event QuorumUpdated(uint256 newQuorum);

    /// @notice The quorum required to execute a proposal using this strategy.
    uint256 public quorum;

    /// @dev Initializer
    // solhint-disable-next-line func-name-mixedcase
    function __OptimisticQuorumExecutionStrategy_init(uint256 _quorum) internal onlyInitializing {
        quorum = _quorum;
    }

    function setQuorum(uint256 _quorum) external onlyOwner {
        quorum = _quorum;
        emit QuorumUpdated(_quorum);
    }

    function execute(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        bytes memory payload
    ) external virtual override;

    /// @notice Returns the status of a proposal that uses an optimistic quorum.
    ///         A proposal is rejected only if a quorum of against votes is reached,
    ///         otherwise it is accepted.
    /// @param proposal The proposal struct.
    /// @param votesAgainst The number of votes against the proposal.
    function getProposalStatus(
        Proposal memory proposal,
        uint256, // votesFor,
        uint256 votesAgainst,
        uint256 // votesAbstain
    ) public view override returns (ProposalStatus) {
        bool rejected = votesAgainst >= quorum;
        if (proposal.finalizationStatus == FinalizationStatus.Cancelled) {
            return ProposalStatus.Cancelled;
        } else if (proposal.finalizationStatus == FinalizationStatus.Executed) {
            return ProposalStatus.Executed;
        } else if (block.timestamp < proposal.startTimestamp) {
            return ProposalStatus.VotingDelay;
        } else if (rejected) {
            // We're past the vote start. If it has been rejected, we can short-circuit and return Rejected.
            return ProposalStatus.Rejected;
        } else if (block.timestamp < proposal.minEndTimestamp) {
            // minEndTimestamp not reached, indicate we're still in the voting period.
            return ProposalStatus.VotingPeriod;
        } else if (block.timestamp < proposal.maxEndTimestamp) {
            // minEndTimestamp < now < maxEndTimestamp ; if not `rejected`, we can indicate it can be `accepted`.
            return ProposalStatus.VotingPeriodAccepted;
        } else {
            // maxEndTimestamp < now ; proposal has not been `rejected` ; we can indicate it's `accepted`.
            return ProposalStatus.Accepted;
        }
    }

    function getStrategyType() external view virtual override returns (string memory);
}

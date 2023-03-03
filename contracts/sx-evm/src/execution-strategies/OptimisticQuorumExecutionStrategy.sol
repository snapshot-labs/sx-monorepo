// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IExecutionStrategy } from "../interfaces/IExecutionStrategy.sol";
import { FinalizationStatus, Proposal, ProposalStatus } from "../types.sol";

abstract contract OptimisticQuorumExecutionStrategy is IExecutionStrategy {
    function execute(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        bytes memory payload
    ) external virtual override;

    function getProposalStatus(
        Proposal memory proposal,
        uint256, // votesFor,
        uint256 votesAgainst,
        uint256 // votesAbstain
    ) public view override returns (ProposalStatus) {
        // Decode the quorum parameter from the execution strategy's params
        uint256 quorum = abi.decode(proposal.executionStrategy.params, (uint256));
        bool rejected = votesAgainst >= quorum;
        if (proposal.finalizationStatus == FinalizationStatus.Cancelled) {
            return ProposalStatus.Cancelled;
        } else if (proposal.finalizationStatus == FinalizationStatus.Executed) {
            return ProposalStatus.Executed;
        } else if (block.timestamp < proposal.startTimestamp) {
            return ProposalStatus.VotingDelay;
        } else if (rejected) {
            // We're past the vote start. If it has been rejected, we can short-circuit and return Rejected
            return ProposalStatus.Rejected;
        } else if (block.timestamp < proposal.minEndTimestamp) {
            // minEndTimestamp not reached, indicate we're still in the voting period
            return ProposalStatus.VotingPeriod;
        } else if (block.timestamp < proposal.maxEndTimestamp) {
            // minEndTimestamp < now < maxEndTimestamp ; if not `rejected`, we can indicate it can be `accepted`.
            return ProposalStatus.VotingPeriodAccepted;
        } else {
            // maxEndTimestamp < now ; proposal has not been `rejected` ; we can indicate it's `accepted`.
            return ProposalStatus.Accepted;
        }
    }
}

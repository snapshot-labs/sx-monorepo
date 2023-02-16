// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../interfaces/IExecutionStrategy.sol";

abstract contract SimpleQuorumExecutionStrategy is IExecutionStrategy {
    // solhint-disable no-unused-vars
    function execute(Proposal memory proposal, bytes memory executionParams) external virtual override;

    function getProposalStatus(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain
    ) public view override returns (ProposalStatus) {
        bool accepted = _quorumReached(proposal.quorum, votesFor, votesAgainst, votesAbstain) &&
            _supported(votesFor, votesAgainst);
        if (proposal.finalizationStatus == FinalizationStatus.Cancelled) {
            return ProposalStatus.Cancelled;
        } else if (proposal.finalizationStatus == FinalizationStatus.Executed) {
            return ProposalStatus.Executed;
        } else if (block.timestamp < proposal.startTimestamp) {
            return ProposalStatus.VotingDelay;
        } else if (block.timestamp < proposal.minEndTimestamp) {
            return ProposalStatus.VotingPeriod;
        } else if (block.timestamp < proposal.maxEndTimestamp) {
            if (accepted) {
                return ProposalStatus.VotingPeriodAccepted;
            } else {
                return ProposalStatus.VotingPeriod;
            }
        } else if (accepted) {
            return ProposalStatus.Accepted;
        } else {
            return ProposalStatus.Rejected;
        }
    }

    function _quorumReached(
        uint256 quorum,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain
    ) internal pure returns (bool) {
        uint256 totalVotes = votesFor + votesAgainst + votesAbstain;
        return totalVotes >= quorum;
    }

    function _supported(uint256 votesFor, uint256 votesAgainst) internal pure returns (bool) {
        return votesFor > votesAgainst;
    }
}

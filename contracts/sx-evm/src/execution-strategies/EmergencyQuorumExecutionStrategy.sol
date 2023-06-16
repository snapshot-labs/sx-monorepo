// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IExecutionStrategy } from "../interfaces/IExecutionStrategy.sol";
import { FinalizationStatus, Proposal, ProposalStatus } from "../types.sol";
import { SpaceManager } from "../utils/SpaceManager.sol";

abstract contract EmergencyQuorumExecutionStrategy is IExecutionStrategy, SpaceManager {
    uint256 public quorum;
    uint256 public emergencyQuorum;

    event QuorumUpdated(uint256 _quorum);
    event EmergencyQuorumUpdated(uint256 _emergencyQuorum);

    /// @dev Initializer
    // solhint-disable-next-line func-name-mixedcase
    function __EmergencyQuorumExecutionStrategy_init(
        uint256 _quorum,
        uint256 _emergencyQuorum
    ) internal onlyInitializing {
        quorum = _quorum;
        emergencyQuorum = _emergencyQuorum;
    }

    function setQuorum(uint256 _quorum) external onlyOwner {
        quorum = _quorum;
        emit QuorumUpdated(_quorum);
    }

    function setEmergencyQuorum(uint256 _emergencyQuorum) external onlyOwner {
        emergencyQuorum = _emergencyQuorum;
        emit EmergencyQuorumUpdated(_emergencyQuorum);
    }

    function execute(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        bytes memory payload
    ) external virtual override;

    // solhint-disable-next-line code-complexity
    function getProposalStatus(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain
    ) public view override returns (ProposalStatus) {
        bool emergencyQuorumReached = _quorumReached(emergencyQuorum, votesFor, votesAbstain);

        bool accepted = _quorumReached(quorum, votesFor, votesAbstain) && _supported(votesFor, votesAgainst);

        if (proposal.finalizationStatus == FinalizationStatus.Cancelled) {
            return ProposalStatus.Cancelled;
        } else if (proposal.finalizationStatus == FinalizationStatus.Executed) {
            return ProposalStatus.Executed;
        } else if (block.timestamp < proposal.startTimestamp) {
            return ProposalStatus.VotingDelay;
        } else if (emergencyQuorumReached) {
            if (_supported(votesFor, votesAgainst)) {
                // Proposal is supported
                if (block.timestamp < proposal.maxEndTimestamp) {
                    // New votes can still come in so return `VotingPeriodAccepted`.
                    return ProposalStatus.VotingPeriodAccepted;
                } else {
                    // No new votes can't come in, so it's definitely accepted.
                    return ProposalStatus.Accepted;
                }
            } else {
                // Proposal is not supported
                if (block.timestamp < proposal.maxEndTimestamp) {
                    // New votes might still come in so return `VotingPeriod`.
                    return ProposalStatus.VotingPeriod;
                } else {
                    // New votes can't come in, so it's definitely rejected.
                    return ProposalStatus.Rejected;
                }
            }
        } else if (block.timestamp < proposal.minEndTimestamp) {
            // Proposal has not reached minEndTimestamp yet.
            return ProposalStatus.VotingPeriod;
        } else if (block.timestamp < proposal.maxEndTimestamp) {
            // Timestamp is between minEndTimestamp and maxEndTimestamp
            if (accepted) {
                return ProposalStatus.VotingPeriodAccepted;
            } else {
                return ProposalStatus.VotingPeriod;
            }
        } else if (accepted) {
            // Quorum reached and proposal supported: no new votes will come in so the proposal is
            // definitely  accepted.
            return ProposalStatus.Accepted;
        } else {
            // Quorum not reached reached or proposal supported: no new votes will come in so the proposal is
            // definitely rejected.
            return ProposalStatus.Rejected;
        }
    }

    function _quorumReached(uint256 _quorum, uint256 _votesFor, uint256 _votesAbstain) internal pure returns (bool) {
        uint256 totalVotes = _votesFor + _votesAbstain;
        return totalVotes >= _quorum;
    }

    function _supported(uint256 _votesFor, uint256 _votesAgainst) internal pure returns (bool) {
        return _votesFor > _votesAgainst;
    }
}

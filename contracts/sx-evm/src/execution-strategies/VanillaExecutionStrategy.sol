// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./SimpleQuorumExecutionStrategy.sol";

contract VanillaExecutionStrategy is SimpleQuorumExecutionStrategy {
    uint256 numExecuted;

    function execute(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        bytes memory payload
    ) external override {
        ProposalStatus proposalStatus = getProposalStatus(proposal, votesFor, votesAgainst, votesAbstain);
        if ((proposalStatus != ProposalStatus.Accepted) && (proposalStatus != ProposalStatus.VotingPeriodAccepted)) {
            revert InvalidProposalStatus(proposalStatus);
        }
        // Check that the execution payload matches the payload supplied when the proposal was created
        if (proposal.executionPayloadHash != keccak256(payload)) revert InvalidPayload();
        numExecuted++;
    }

    function getStrategyType() external pure override returns (string memory) {
        return "SimpleQuorumVanilla";
    }
}

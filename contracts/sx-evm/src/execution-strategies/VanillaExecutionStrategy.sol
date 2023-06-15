// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SimpleQuorumExecutionStrategy } from "./SimpleQuorumExecutionStrategy.sol";
import { Proposal, ProposalStatus } from "../types.sol";

/// @title Vanilla Execution Strategy
contract VanillaExecutionStrategy is SimpleQuorumExecutionStrategy {
    uint256 internal numExecuted;

    constructor(address _owner, uint256 _quorum) {
        setUp(abi.encode(_owner, _quorum));
    }

    function setUp(bytes memory initParams) public initializer {
        (address _owner, uint256 _quorum) = abi.decode(initParams, (address, uint256));
        __Ownable_init();
        transferOwnership(_owner);
        __SimpleQuorumExecutionStrategy_init(_quorum);
    }

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

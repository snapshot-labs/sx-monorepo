// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { OptimisticQuorumExecutionStrategy } from "../src/execution-strategies/OptimisticQuorumExecutionStrategy.sol";
import { Choice, IndexedStrategy, Proposal, ProposalStatus, Strategy } from "../src/types.sol";

// Dummy implementation of the optimistic quorum
contract OptimisticExec is OptimisticQuorumExecutionStrategy {
    uint256 internal numExecuted;

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

    function getStrategyType() external pure returns (string memory) {
        return "OptimisticQuorumExecution";
    }
}

contract OptimisticTest is SpaceTest {
    OptimisticExec internal optimisticQuorumStrategy;

    function setUp() public virtual override {
        super.setUp();

        optimisticQuorumStrategy = new OptimisticExec();
        // Update Quorum. Will need 2 `NO` votes in order to be rejected.
        quorum = 2;
        Strategy[] memory newStrategies = new Strategy[](1);
        newStrategies[0] = Strategy(address(optimisticQuorumStrategy), abi.encode(quorum));

        executionStrategy = IndexedStrategy(1, new bytes(0));
        // Add the optimistic quorum execution strategy
        space.addExecutionStrategies(newStrategies);

        uint8[] memory toRemove = new uint8[](1);
        toRemove[0] = 0;
        // Remove the old execution strategy
        space.removeExecutionStrategies(toRemove);
    }

    function testOptimisticQuorumNoVotes() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testOptimisticQuorumOneVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testOptimisticQuorumReached() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);
        _vote(address(42), proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testOptimisticQuorumEquality() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        // 2 votes for
        _vote(address(1), proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        _vote(address(2), proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        // 2 votes against
        _vote(address(11), proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);
        _vote(address(12), proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);

        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testOptimisticQuorumMinVotingPeriodReached() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(address(11), proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);
        _vote(address(12), proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);

        vm.warp(block.timestamp + space.minVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testOptimisticQuorumMinVotingPeriodAccepted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.warp(block.timestamp + space.minVotingDuration());

        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testOptimisticQuorumLotsOfVotes() public {
        // SET A QUORUM OF 100
        {
            quorum = 100;
            Strategy[] memory newStrategies = new Strategy[](1);
            newStrategies[0] = Strategy(address(optimisticQuorumStrategy), abi.encode(quorum));

            executionStrategy = IndexedStrategy(2, new bytes(0));
            // Add the optimistic quorum execution strategy
            space.addExecutionStrategies(newStrategies);

            uint8[] memory toRemove = new uint8[](1);
            toRemove[0] = 1;
            // Remove the old execution strategy
            space.removeExecutionStrategies(toRemove);
        }

        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        // Add 200 FOR votes
        for (uint160 i = 10; i < 210; i++) {
            _vote(address(i), proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        }
        // Add 150 ABSTAIN votes
        for (uint160 i = 500; i < 650; i++) {
            _vote(address(i), proposalId, Choice.Abstain, userVotingStrategies, voteMetadataUri);
        }
        // Add 100 AGAINST votes
        for (uint160 i = 700; i < 800; i++) {
            _vote(address(i), proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);
        }

        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }
}

// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.15;

import "./utils/Space.t.sol";
import "forge-std/Test.sol";
import "../src/types.sol";

contract FinalizeProposalTest is SpaceTest {
    function testFinalizeWorks() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        _vote(author, proposalId, Choice.For, userVotingStrategies);

        // Check that the event gets fired correctly.
        vm.expectEmit(true, true, true, true);
        emit ProposalFinalized(proposalId, ProposalOutcome.Accepted);

        space.finalizeProposal(proposalId, executionStrategy.params);
    }

    function testFinalizeInvalidProposal() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        uint256 invalidProposalId = proposalId + 1;

        _vote(author, proposalId, Choice.For, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        space.finalizeProposal(invalidProposalId, executionStrategy.params);
    }

    function testFinalizeAlreadyExecuted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        _vote(author, proposalId, Choice.For, userVotingStrategies);
        space.finalizeProposal(proposalId, executionStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(ProposalAlreadyExecuted.selector));
        space.finalizeProposal(proposalId, executionStrategy.params);
    }

    function testFinalizeRemovedExecutionStrategy() public {
        VanillaExecutionStrategy _vanilla = new VanillaExecutionStrategy();

        Strategy[] memory newExecutionStrategies = new Strategy[](1);
        newExecutionStrategies[0] = Strategy(address(_vanilla), new bytes(0));

        address[] memory newExecutionStrategiesAddresses = new address[](1);
        newExecutionStrategiesAddresses[0] = newExecutionStrategies[0].addy;

        // Add the strategy
        space.addExecutionStrategies(newExecutionStrategiesAddresses);

        uint256 proposalId = _createProposal(
            author,
            proposalMetadataUri,
            newExecutionStrategies[0],
            userVotingStrategies
        );

        _vote(author, proposalId, Choice.For, userVotingStrategies);

        // Remove the strategy
        space.removeExecutionStrategies(newExecutionStrategiesAddresses);

        // Ensure that the proposal gets cancelled if the strategy has been removed.
        vm.expectEmit(true, true, true, true);
        emit ProposalFinalized(proposalId, ProposalOutcome.Cancelled);
        space.finalizeProposal(proposalId, newExecutionStrategies[0].params);

        // Double check by checking the proposal execution status
        Proposal memory proposal = space.getProposal(proposalId);
        assertEq(uint8(proposal.finalizationStatus), uint8(FinalizationStatus.FinalizedAndCancelled));
    }

    function testFinalizeMinDurationNotElapsed() public {
        space.setMinVotingDuration(100);

        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        _vote(author, proposalId, Choice.For, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(MinVotingDurationHasNotElapsed.selector));
        space.finalizeProposal(proposalId, executionStrategy.params);

        // Ensure we can still finalize once min voting duration has elapsed.
        vm.warp(block.timestamp + space.minVotingDuration());
        space.finalizeProposal(proposalId, executionStrategy.params);
    }

    function testFinalizeExecutionMismatch() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        _vote(author, proposalId, Choice.For, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(ExecutionHashMismatch.selector));
        space.finalizeProposal(proposalId, new bytes(4242));
    }

    function testFinalizeQuorumNotReachedYet() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(QuorumNotReachedYet.selector));
        space.finalizeProposal(proposalId, executionStrategy.params);
    }

    function testFinalizeQuorumNotReachedAtAll() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.warp(block.timestamp + space.maxVotingDuration());

        // Should finalize
        space.finalizeProposal(proposalId, executionStrategy.params);

        // Ensure proposal is `Rejected`.
        ProposalStatus status = space.getProposalStatus(proposalId);
        assertEq(uint8(status), uint8(ProposalStatus.Rejected));
    }

    function testFinalizeFor() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies);

        space.finalizeProposal(proposalId, executionStrategy.params);
        // Ensure proposal is `Accepted`.
        ProposalStatus status = space.getProposalStatus(proposalId);
        assertEq(uint8(status), uint8(ProposalStatus.Accepted));
    }

    function testFinalizeAgainst() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.Against, userVotingStrategies);

        space.finalizeProposal(proposalId, executionStrategy.params);
        // Ensure proposal is `Rejected`.
        ProposalStatus status = space.getProposalStatus(proposalId);
        assertEq(uint8(status), uint8(ProposalStatus.Rejected));
    }

    function testFinalizeAbstain() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.Abstain, userVotingStrategies);

        space.finalizeProposal(proposalId, executionStrategy.params);
        // Ensure proposal is `Rejected`.
        ProposalStatus status = space.getProposalStatus(proposalId);
        assertEq(uint8(status), uint8(ProposalStatus.Rejected));
    }
}

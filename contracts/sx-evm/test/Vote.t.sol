// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.15;

import "./utils/Space.t.sol";
import "forge-std/Test.sol";
import "../src/types.sol";

contract VoteTest is SpaceTest {
    function testVoteWorks() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectEmit(true, true, true, true);
        emit VoteCreated(proposalId, author, Vote(Choice.For, 1));
        vanillaAuthenticator.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(author, proposalId, Choice.For, userVotingStrategies)
        );
    }

    function testVoteInvalidAuth() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
        space.vote(author, proposalId, Choice.For, userVotingStrategies);
    }

    function testVoteInvalidProposalId() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        uint256 invalidProposalId = proposalId + 1;

        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        _vote(author, invalidProposalId, Choice.For, userVotingStrategies);
    }

    function testVoteAlreadyExecuted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        _vote(author, proposalId, Choice.For, userVotingStrategies);

        space.finalizeProposal(proposalId, executionStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(ProposalAlreadyExecuted.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies);
    }

    function testVoteVotingPeriodHasEnded() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.warp(block.timestamp + space.maxVotingDuration());
        vm.expectRevert(abi.encodeWithSelector(VotingPeriodHasEnded.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies);
    }

    function testVoteVotingPeriodHasNotStarted() public {
        space.setVotingDelay(100);
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(VotingPeriodHasNotStarted.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies);

        vm.warp(block.timestamp + space.votingDelay());
        _vote(author, proposalId, Choice.For, userVotingStrategies);
    }

    function testVoteDoubleVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        _vote(author, proposalId, Choice.For, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(UserHasAlreadyVoted.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies);
    }

    function testVoteNoVotingPower() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        IndexedStrategy[] memory empty = new IndexedStrategy[](0);

        vm.expectRevert(abi.encodeWithSelector(UserHasNoVotingPower.selector));
        _vote(author, proposalId, Choice.For, empty);
    }
}

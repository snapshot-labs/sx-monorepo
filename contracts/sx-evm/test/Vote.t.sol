// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Choice, IndexedStrategy, Strategy } from "../src/types.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";

contract VoteTest is SpaceTest {
    function testVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.expectEmit(true, true, true, true);
        emit VoteCastWithMetadata(proposalId, author, Choice.For, 1, voteMetadataURI);
        vanillaAuthenticator.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );
    }

    function testVoteInvalidAuth() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
        space.vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteInvalidProposalId() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);
        uint256 invalidProposalId = proposalId + 1;

        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        _vote(author, invalidProposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteAlreadyExecuted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        space.execute(proposalId, executionStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(ProposalFinalized.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteVotingPeriodHasEnded() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.warp(block.timestamp + space.maxVotingDuration());
        vm.expectRevert(abi.encodeWithSelector(VotingPeriodHasEnded.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteVotingPeriodHasNotStarted() public {
        space.setVotingDelay(100);
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(VotingPeriodHasNotStarted.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        vm.warp(block.timestamp + space.votingDelay());
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteDoubleVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        vm.expectRevert(abi.encodeWithSelector(UserHasAlreadyVoted.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteNoVotingPower() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        IndexedStrategy[] memory empty = new IndexedStrategy[](0);

        vm.expectRevert(abi.encodeWithSelector(UserHasNoVotingPower.selector));
        _vote(author, proposalId, Choice.For, empty, voteMetadataURI);
    }

    function testVoteRemovedVotingStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        // removing the voting strategy at index 0
        uint8[] memory removeIndices = new uint8[](1);
        removeIndices[0] = 0;
        space.removeVotingStrategies(removeIndices);

        // casting a vote with the voting strategy that was just removed.
        // this is possible because voting strategies are stored inside a proposal.
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteAddedVotingStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        // adding a new voting strategy which will reside at index 1
        Strategy[] memory newVotingStrategies = new Strategy[](1);
        newVotingStrategies[0] = votingStrategies[0];
        string[] memory newVotingStrategyMetadataURIs = new string[](0);
        space.addVotingStrategies(newVotingStrategies, newVotingStrategyMetadataURIs);

        // attempting to use the new voting strategy to cast a vote.
        // this will fail fail because the strategy was added after the proposal was created.
        IndexedStrategy[] memory newUserVotingStrategies = new IndexedStrategy[](1);
        newUserVotingStrategies[0] = IndexedStrategy(1, new bytes(0));
        vm.expectRevert(abi.encodeWithSelector(InvalidVotingStrategyIndex.selector, 1)); // array out of bounds
        _vote(author, proposalId, Choice.For, newUserVotingStrategies, voteMetadataURI);
    }

    function testVoteInvalidVotingStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        // This voting strategy is not registered in the space.
        IndexedStrategy[] memory newUserVotingStrategies = new IndexedStrategy[](1);
        newUserVotingStrategies[0] = IndexedStrategy(1, new bytes(0));
        vm.expectRevert(abi.encodeWithSelector(InvalidVotingStrategyIndex.selector, 1)); // array out of bounds
        _vote(author, proposalId, Choice.For, newUserVotingStrategies, voteMetadataURI);
    }

    function testVoteDuplicateUsedVotingStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        IndexedStrategy[] memory duplicateStrategies = new IndexedStrategy[](2);
        duplicateStrategies[0] = userVotingStrategies[0];
        duplicateStrategies[1] = userVotingStrategies[0];
        vm.expectRevert(abi.encodeWithSelector(DuplicateFound.selector, duplicateStrategies[0].index));
        _vote(author, proposalId, Choice.For, duplicateStrategies, voteMetadataURI);
    }

    function testVoteMultipleStrategies() public {
        VanillaVotingStrategy strat2 = new VanillaVotingStrategy();
        VanillaVotingStrategy strat3 = new VanillaVotingStrategy();
        Strategy[] memory toAdd = new Strategy[](2);
        toAdd[0] = Strategy(address(strat2), new bytes(0));
        toAdd[1] = Strategy(address(strat3), new bytes(0));
        string[] memory newVotingStrategyMetadataURIs = new string[](0);

        space.addVotingStrategies(toAdd, newVotingStrategyMetadataURIs);

        IndexedStrategy[] memory newVotingStrategies = new IndexedStrategy[](3);
        newVotingStrategies[0] = userVotingStrategies[0]; // base strat
        newVotingStrategies[1] = IndexedStrategy(1, new bytes(0)); // strat2
        newVotingStrategies[2] = IndexedStrategy(2, new bytes(0)); // strat3

        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        uint256 expectedVotingPower = 3; // 1 voting power per vanilla strat, so 3
        vm.expectEmit(true, true, true, true);
        emit VoteCastWithMetadata(proposalId, author, Choice.For, expectedVotingPower, voteMetadataURI);
        _vote(author, proposalId, Choice.For, newVotingStrategies, voteMetadataURI);
    }
}

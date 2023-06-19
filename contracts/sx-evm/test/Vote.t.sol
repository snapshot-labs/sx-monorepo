// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { TRUE, FALSE, SpaceTest } from "./utils/Space.t.sol";
import { Choice, IndexedStrategy, Strategy, UpdateSettingsCalldata } from "../src/types.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";

contract VoteTest is SpaceTest {
    error DuplicateFound(uint8 index);

    function testVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        vm.expectEmit(true, true, true, true);
        emit VoteCastWithMetadata(proposalId, author, Choice.For, 1, voteMetadataURI);
        vanillaAuthenticator.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );

        assertEq(space.voteRegistry(proposalId, author), TRUE);
    }

    function testVoteInvalidAuth() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector));
        space.vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteInvalidProposalId() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        uint256 invalidProposalId = proposalId + 1;

        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        _vote(author, invalidProposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteAlreadyExecuted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        space.execute(proposalId, executionStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(ProposalFinalized.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteVotingPeriodHasEnded() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        vm.roll(block.number + space.maxVotingDuration());
        vm.expectRevert(abi.encodeWithSelector(VotingPeriodHasEnded.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteVotingPeriodHasNotStarted() public {
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                100,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        vm.expectRevert(abi.encodeWithSelector(VotingPeriodHasNotStarted.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        vm.roll(block.number + space.votingDelay());
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteDoubleVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        vm.expectRevert(abi.encodeWithSelector(UserAlreadyVoted.selector));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteNoVotingPower() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        IndexedStrategy[] memory empty = new IndexedStrategy[](0);

        vm.expectRevert(abi.encodeWithSelector(UserHasNoVotingPower.selector));
        _vote(author, proposalId, Choice.For, empty, voteMetadataURI);
    }

    function testVoteRemovedVotingStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // adding a new voting strategy which will reside at index 1
        Strategy[] memory newVotingStrategies = new Strategy[](1);
        newVotingStrategies[0] = votingStrategies[0];
        string[] memory newVotingStrategyMetadataURIs = new string[](1);

        // removing the voting strategy at index 0
        uint8[] memory removeIndices = new uint8[](1);
        removeIndices[0] = 0;
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                newVotingStrategies,
                newVotingStrategyMetadataURIs,
                removeIndices
            )
        );

        // casting a vote with the voting strategy that was just removed.
        // this is possible because voting strategies are stored inside a proposal.
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testVoteAddedVotingStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // adding a new voting strategy which will reside at index 1
        Strategy[] memory newVotingStrategies = new Strategy[](1);
        newVotingStrategies[0] = votingStrategies[0];
        string[] memory newVotingStrategyMetadataURIs = new string[](1);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                newVotingStrategies,
                newVotingStrategyMetadataURIs,
                NO_UPDATE_UINT8S
            )
        );

        // attempting to use the new voting strategy to cast a vote.
        // this will fail fail because the strategy was added after the proposal was created.
        IndexedStrategy[] memory newUserVotingStrategies = new IndexedStrategy[](1);
        newUserVotingStrategies[0] = IndexedStrategy(1, new bytes(0));
        vm.expectRevert(abi.encodeWithSelector(InvalidStrategyIndex.selector, 1)); // array out of bounds
        _vote(author, proposalId, Choice.For, newUserVotingStrategies, voteMetadataURI);
    }

    function testVoteInvalidVotingStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // This voting strategy is not registered in the space.
        IndexedStrategy[] memory newUserVotingStrategies = new IndexedStrategy[](1);
        newUserVotingStrategies[0] = IndexedStrategy(1, new bytes(0));
        vm.expectRevert(abi.encodeWithSelector(InvalidStrategyIndex.selector, 1)); // array out of bounds
        _vote(author, proposalId, Choice.For, newUserVotingStrategies, voteMetadataURI);
    }

    function testVoteDuplicateUsedVotingStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

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
        string[] memory newVotingStrategyMetadataURIs = new string[](2);

        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                toAdd,
                newVotingStrategyMetadataURIs,
                NO_UPDATE_UINT8S
            )
        );

        IndexedStrategy[] memory newVotingStrategies = new IndexedStrategy[](3);
        newVotingStrategies[0] = userVotingStrategies[0]; // base strat
        newVotingStrategies[1] = IndexedStrategy(1, new bytes(0)); // strat2
        newVotingStrategies[2] = IndexedStrategy(2, new bytes(0)); // strat3

        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        uint256 expectedVotingPower = 3; // 1 voting power per vanilla strat, so 3
        vm.expectEmit(true, true, true, true);
        emit VoteCastWithMetadata(proposalId, author, Choice.For, expectedVotingPower, voteMetadataURI);
        _vote(author, proposalId, Choice.For, newVotingStrategies, voteMetadataURI);
    }
}

// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "./utils/Space.t.sol";
import "../src/types.sol";

contract ExecuteTest is SpaceTest {
    function testExecute() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        // vm.expectEmit(true, true, true, true);
        // emit ProposalExecuted(proposalId);
        snapStart("Execute");
        space.execute(proposalId, executionStrategy.params);
        snapEnd();

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testExecuteInvalidProposal() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        uint256 invalidProposalId = proposalId + 1;
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        space.execute(invalidProposalId, executionStrategy.params);
    }

    function testExecuteAlreadyExecuted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());
        space.execute(proposalId, executionStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Executed));
        space.execute(proposalId, executionStrategy.params);
    }

    function testExecuteMinDurationNotElapsed() public {
        space.setMinVotingDuration(100);
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.VotingPeriod));
        space.execute(proposalId, executionStrategy.params);

        vm.warp(block.timestamp + space.minVotingDuration());
        space.execute(proposalId, executionStrategy.params);
    }

    function testExecuteQuorumNotReachedYet() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.VotingPeriod));
        space.execute(proposalId, executionStrategy.params);
    }

    function testExecuteQuorumNotReachedAtAll() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testExecuteWithAgainstVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.Against, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testExecuteWithAbstainVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.Abstain, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testExecuteRemovedExecutionStrategy() public {
        VanillaExecutionStrategy _vanilla = new VanillaExecutionStrategy();

        Strategy[] memory newExecutionStrategies = new Strategy[](1);
        newExecutionStrategies[0] = Strategy(address(_vanilla), abi.encode(uint256(quorum)));

        // Add the strategy, which will be assigned the index `1`.
        space.addExecutionStrategies(newExecutionStrategies);

        uint256 proposalId = _createProposal(
            author,
            proposalMetadataUri,
            IndexedStrategy(1, new bytes(0)),
            userVotingStrategies
        );

        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);

        // New strategy index should be `1` (`0` is used for the first one).
        uint8[] memory newIndices = new uint8[](1);
        newIndices[0] = 1;
        space.removeExecutionStrategies(newIndices);

        // Execution still works with the removed strategy because its stored inside the proposal.
        space.execute(proposalId, new bytes(0));

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testExecuteInvalidPayload() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);

        vm.expectRevert(abi.encodeWithSelector(InvalidPayload.selector));
        space.execute(proposalId, new bytes(4242));
    }
}

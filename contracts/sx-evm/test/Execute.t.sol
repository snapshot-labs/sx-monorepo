// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Choice, IndexedStrategy, ProposalStatus, Strategy, UpdateSettingsInput } from "../src/types.sol";
import { VanillaExecutionStrategy } from "../src/execution-strategies/VanillaExecutionStrategy.sol";

contract ExecuteTest is SpaceTest {
    function testExecute() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testExecuteInvalidProposal() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        uint256 invalidProposalId = proposalId + 1;
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        space.execute(invalidProposalId, executionStrategy.params);
    }

    function testExecuteAlreadyExecuted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());
        space.execute(proposalId, executionStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Executed));
        space.execute(proposalId, executionStrategy.params);
    }

    function testExecuteMinDurationNotElapsed() public {
        space.updateSettings(
            UpdateSettingsInput(
                100,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
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
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.VotingPeriod));
        space.execute(proposalId, executionStrategy.params);

        vm.warp(block.timestamp + space.minVotingDuration());
        space.execute(proposalId, executionStrategy.params);
    }

    function testExecuteQuorumNotReachedYet() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.VotingPeriod));
        space.execute(proposalId, executionStrategy.params);
    }

    function testExecuteQuorumNotReachedAtAll() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testExecuteWithAgainstVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.Against, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testExecuteWithAbstainVote() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.Abstain, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Rejected));
        space.execute(proposalId, executionStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Rejected));
    }

    function testExecuteInvalidPayload() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        vm.expectRevert(abi.encodeWithSelector(InvalidPayload.selector));
        space.execute(proposalId, new bytes(4242));
    }

    function testExecuteInvalidExecutionStrategy() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, Strategy(address(space), ""), new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert();
        space.execute(proposalId, executionStrategy.params);
    }

    function testGetStrategyType() external {
        assertEq(vanillaExecutionStrategy.getStrategyType(), "SimpleQuorumVanilla");
    }
}

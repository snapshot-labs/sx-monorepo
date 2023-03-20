// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Choice, Enum, IndexedStrategy, MetaTransaction, ProposalStatus, Strategy, Proposal } from "../src/types.sol";
import { TimelockExecutionStrategy } from "../src/execution-strategies/TimelockExecutionStrategy.sol";
import { MockImplementation } from "./mocks/MockImplementation.sol";

contract TimelockExecutionStrategyTest is SpaceTest {
    error InvalidSpace();
    error TimelockDelayNotMet();
    error ProposalNotQueued();
    error DuplicateExecutionPayloadHash();
    error OnlyVetoGuardian();
    event TransactionQueued(MetaTransaction transaction, uint256 executionTime);
    event ProposalVetoed(bytes32 executionPayloadHash);
    event VetoGuardianSet(address vetoGuardian, address newVetoGuardian);

    TimelockExecutionStrategy public timelockExecutionStrategy;

    address private recipient = address(0xc0ffee);

    function setUp() public override {
        super.setUp();

        address[] memory spaces = new address[](1);
        spaces[0] = address(space);

        timelockExecutionStrategy = new TimelockExecutionStrategy(owner, spaces, 1000, quorum);
        vm.deal(address(timelockExecutionStrategy), 1000);
    }

    function testQueueingFromUnauthorizedSpace() external {
        timelockExecutionStrategy.disableSpace(address(space));

        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(InvalidSpace.selector);
        space.execute(proposalId, abi.encode(transactions));
    }

    function testQueueing() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit TransactionQueued(transactions[0], block.timestamp + 1000);
        space.execute(proposalId, abi.encode(transactions));
    }

    function testQueueingFailedProposal() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert();
        space.execute(proposalId, abi.encode(transactions));
    }

    function testQueueingDoubleQueue() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit TransactionQueued(transactions[0], block.timestamp + 1000);
        space.execute(proposalId, abi.encode(transactions));

        vm.expectRevert();
        space.execute(proposalId, abi.encode(transactions));
    }

    function testQueueingQueueDuplicate() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        uint256 proposalId2 = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        _vote(author, proposalId2, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        space.execute(proposalId, abi.encode(transactions));

        // Will revert due to duplicate execution payload hash
        vm.expectRevert(DuplicateExecutionPayloadHash.selector);
        space.execute(proposalId2, abi.encode(transactions));
    }

    function testQueueingQueueDuplicateUniqueSalt() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        // Same transaction, but different salt
        MetaTransaction[] memory transactions2 = new MetaTransaction[](1);
        transactions2[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 1);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        uint256 proposalId2 = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions2)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        _vote(author, proposalId2, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        space.execute(proposalId, abi.encode(transactions));

        space.execute(proposalId2, abi.encode(transactions2));
    }

    function testQueueingInvalidPayload() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        transactions[0] = MetaTransaction(recipient, 2, "", Enum.Operation.Call, 0);

        vm.expectRevert(InvalidPayload.selector);
        space.execute(proposalId, abi.encode(transactions));
    }

    function testExecute() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit TransactionQueued(transactions[0], block.timestamp + 1000);
        space.execute(proposalId, abi.encode(transactions));

        assertEq(recipient.balance, 0);

        vm.warp(block.timestamp + timelockExecutionStrategy.timelockDelay());
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));

        assertEq(recipient.balance, 1);
    }

    function testExecuteTransactionFailed() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1001, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        space.execute(proposalId, abi.encode(transactions));

        vm.warp(block.timestamp + timelockExecutionStrategy.timelockDelay());

        vm.expectRevert(ExecutionFailed.selector);
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));
    }

    function testExecuteInvalidPayload() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        space.execute(proposalId, abi.encode(transactions));

        vm.warp(block.timestamp + timelockExecutionStrategy.timelockDelay());
        transactions[0] = MetaTransaction(recipient, 2, "", Enum.Operation.Call, 0);

        vm.expectRevert(ProposalNotQueued.selector);
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));
    }

    function testExecuteBeforeDelay() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit TransactionQueued(transactions[0], block.timestamp + 1000);
        space.execute(proposalId, abi.encode(transactions));

        vm.expectRevert(TimelockDelayNotMet.selector);
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));
    }

    function testExecuteNotQueued() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(ProposalNotQueued.selector);
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));
    }

    function testExecuteDoubleExecution() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit TransactionQueued(transactions[0], block.timestamp + 1000);
        space.execute(proposalId, abi.encode(transactions));

        assertEq(recipient.balance, 0);

        vm.warp(block.timestamp + timelockExecutionStrategy.timelockDelay());
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));

        vm.expectRevert(ProposalNotQueued.selector);
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));
    }

    function testExecuteDelegateCall() external {
        MockImplementation impl = new MockImplementation();

        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(
            address(impl),
            0,
            abi.encodeWithSignature("transferEth(address,uint256)", recipient, 1),
            Enum.Operation.DelegateCall,
            0
        );
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit TransactionQueued(transactions[0], block.timestamp + 1000);
        space.execute(proposalId, abi.encode(transactions));

        assertEq(recipient.balance, 0);

        vm.warp(block.timestamp + timelockExecutionStrategy.timelockDelay());
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));

        assertEq(recipient.balance, 1);
    }

    function testVetoProposal() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        space.execute(proposalId, abi.encode(transactions));

        // Set veto guardian
        address vetoGuardian = address(0x7e20);
        vm.expectEmit(true, true, true, true);
        emit VetoGuardianSet(address(0), vetoGuardian);
        timelockExecutionStrategy.setVetoGuardian(vetoGuardian);

        vm.prank(vetoGuardian);
        vm.expectEmit(true, true, true, true);
        emit ProposalVetoed(keccak256(abi.encode(transactions)));
        timelockExecutionStrategy.veto(keccak256(abi.encode(transactions)));

        vm.warp(block.timestamp + timelockExecutionStrategy.timelockDelay());
        vm.expectRevert(ProposalNotQueued.selector);
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));
    }

    function testVetoOnlyGuardian() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        space.execute(proposalId, abi.encode(transactions));

        address vetoGuardian = address(0x7e20);
        vm.prank(vetoGuardian);
        vm.expectRevert(OnlyVetoGuardian.selector);
        timelockExecutionStrategy.veto(keccak256(abi.encode(transactions)));
    }
}

// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.15;

import "./utils/Space.t.sol";
import "./mocks/Avatar.sol";
import "../src/execution-strategies/AvatarExecutionStrategy.sol";
import "../src/types.sol";

contract AvatarExecutionStrategyTest is SpaceTest {
    error TransactionsFailed();
    error InvalidSpace();

    event AvatarExecutionStrategySetUp(address _owner, address _target, address[] _spaces);
    event TargetSet(address indexed newTarget);
    event SpaceEnabled(address space);
    event SpaceDisabled(address space);

    Avatar public avatar;
    AvatarExecutionStrategy public avatarExecutionStrategy;

    address recipient = address(0xc0ffee);

    function setUp() public override {
        super.setUp();

        avatar = new Avatar();
        vm.deal(address(avatar), 1000);

        // Deploy and activate the execution strategy on the avatar
        address[] memory spaces = new address[](1);
        spaces[0] = address(space);
        avatarExecutionStrategy = new AvatarExecutionStrategy(owner, address(avatar), spaces);
        avatar.enableModule(address(avatarExecutionStrategy));

        // Activate the execution strategy on the space
        Strategy[] memory executionStrategies = new Strategy[](1);
        executionStrategies[0] = Strategy(address(avatarExecutionStrategy), abi.encode(uint256(quorum)));
        // This strategy will reside at index 1 in the space's execution strategies array
        space.addExecutionStrategies(executionStrategies);
    }

    function testExecution() public {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataUri,
            IndexedStrategy(1, abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, abi.encode(transactions));

        // recipient should have received 1 wei
        assertEq(recipient.balance, 1);
        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testInvalidTx() public {
        // This transaction will fail because the avatar does not have enough funds
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(address(owner), 1001, "", Enum.Operation.Call);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataUri,
            IndexedStrategy(1, abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(ExecutionFailed.selector);
        space.execute(proposalId, abi.encode(transactions));
    }

    function testMultiTx() public {
        MetaTransaction[] memory transactions = new MetaTransaction[](2);
        transactions[0] = MetaTransaction(address(recipient), 1, "", Enum.Operation.Call);
        // Creating a transaction that will enable a new dummy module on the avatar
        transactions[1] = MetaTransaction(
            address(avatar),
            0,
            abi.encodeWithSignature("enableModule(address)", address(0xbeef)),
            Enum.Operation.Call
        );
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataUri,
            IndexedStrategy(1, abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        assertEq(recipient.balance, 0); // sanity check
        assertEq(avatar.isModuleEnabled(address(0xbeef)), false); // sanity check
        space.execute(proposalId, abi.encode(transactions));
        assertEq(recipient.balance, 1);
        assertEq(avatar.isModuleEnabled(address(0xbeef)), true);
    }

    function testInvalidMultiTx() public {
        MetaTransaction[] memory transactions = new MetaTransaction[](2);
        transactions[0] = MetaTransaction(
            address(avatar),
            0,
            abi.encodeWithSignature("enableModule(address)", address(0xbeef)),
            Enum.Operation.Call
        );
        // invalid tx
        transactions[1] = MetaTransaction(address(owner), 1001, "", Enum.Operation.Call);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataUri,
            IndexedStrategy(1, abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(ExecutionFailed.selector);
        space.execute(proposalId, abi.encode(transactions));
        // both txs should have reverted despite the first one being valid
        assertEq(recipient.balance, 0);
        assertEq(avatar.isModuleEnabled(address(0xbeef)), false);
    }

    function testSetTarget() public {
        address newTarget = address(0xbeef);
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit TargetSet(newTarget);
        avatarExecutionStrategy.setTarget(newTarget);
        assertEq(address(avatarExecutionStrategy.target()), newTarget);
    }

    function testUnauthorizedSetTarget() public {
        address newTarget = address(0xbeef);
        vm.prank(unauthorized);
        vm.expectRevert("Ownable: caller is not the owner");
        avatarExecutionStrategy.setTarget(newTarget);
    }

    function testTransferOwnership() public {
        address newOwner = address(0xbeef);
        vm.prank(owner);
        avatarExecutionStrategy.transferOwnership(newOwner);
        assertEq(address(avatarExecutionStrategy.owner()), newOwner);
    }

    function testUnauthorizedTransferOwnership() public {
        address newOwner = address(0xbeef);
        vm.prank(unauthorized);
        vm.expectRevert("Ownable: caller is not the owner");
        avatarExecutionStrategy.transferOwnership(newOwner);
    }

    function testDoubleInitialization() public {
        vm.expectRevert("Initializable: contract is already initialized");
        address[] memory spaces = new address[](1);
        spaces[0] = address(this);
        avatarExecutionStrategy.setUp(abi.encode(owner, address(avatar), spaces));
    }

    function testEnableSpace() public {
        address space = address(0xbeef);
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SpaceEnabled(space);
        avatarExecutionStrategy.enableSpace(space);
        assertEq(avatarExecutionStrategy.isSpaceEnabled(space), true);
    }

    function testEnableInvalidSpace() public {
        // The zero address is not a valid space
        address space = address(0);
        vm.prank(owner);
        vm.expectRevert(InvalidSpace.selector);
        avatarExecutionStrategy.enableSpace(space);
    }

    function testEnableSpaceTwice() public {
        vm.prank(owner);
        vm.expectRevert(InvalidSpace.selector);
        avatarExecutionStrategy.enableSpace(address(space));
    }

    function testUnauthorizedEnableSpace() public {
        address space = address(0xbeef);
        vm.prank(unauthorized);
        vm.expectRevert("Ownable: caller is not the owner");
        avatarExecutionStrategy.enableSpace(space);
    }

    function testDisableSpace() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SpaceDisabled(address(space));
        avatarExecutionStrategy.disableSpace(address(space));
        assertEq(avatarExecutionStrategy.isSpaceEnabled(address(space)), false);

        // Check that proposals from the disabled space can't be executed
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataUri,
            IndexedStrategy(1, abi.encode(transactions)),
            userVotingStrategies
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectRevert(InvalidSpace.selector);
        space.execute(proposalId, abi.encode(transactions));
    }

    function testDisableInvalidSpace() public {
        // This space is not enabled
        address space = address(0xbeef);
        vm.prank(owner);
        vm.expectRevert(InvalidSpace.selector);
        avatarExecutionStrategy.disableSpace(space);
    }

    function testUnauthorizedDisableSpace() public {
        vm.prank(unauthorized);
        vm.expectRevert("Ownable: caller is not the owner");
        avatarExecutionStrategy.disableSpace(address(space));
    }
}

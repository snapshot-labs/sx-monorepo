// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "./mocks/Avatar.sol";
import "../src/execution-strategies/AvatarExecutionStrategy.sol";

contract AvatarExecutionStrategyTest is Test {
    error SpaceNotEnabled();
    error TransactionsFailed();
    error InvalidSpace();

    event AvatarExecutionStrategySetUp(address _owner, address _target, address[] _spaces);
    event TargetSet(address indexed newTarget);
    event SpaceEnabled(address space);
    event SpaceDisabled(address space);

    address owner = address(1);
    address unauthorized = address(2);

    Avatar public avatar;
    AvatarExecutionStrategy public avatarExecutionStrategy;

    function setUp() public {
        avatar = new Avatar();
        vm.deal(address(avatar), 1000);

        address[] memory spaces = new address[](1);
        // We use this test contract as a dummy space contract for the test.
        spaces[0] = address(this);
        avatarExecutionStrategy = new AvatarExecutionStrategy(owner, address(avatar), spaces);

        avatar.enableModule(address(avatarExecutionStrategy));
    }

    function testSingleTx() public {
        // Creating a transaction that will send 1 wei to the owner
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(address(owner), 1, "", Enum.Operation.Call);

        assertEq(owner.balance, 0); // sanity check
        avatarExecutionStrategy.execute(ProposalOutcome.Accepted, abi.encode(transactions));
        // owner should have received 1 wei
        assertEq(owner.balance, 1);
    }

    function testMultiTx() public {
        MetaTransaction[] memory transactions = new MetaTransaction[](2);
        transactions[0] = MetaTransaction(address(owner), 1, "", Enum.Operation.Call);
        // Creating a transaction that will enable a new dummy module on the avatar
        transactions[1] = MetaTransaction(
            address(avatar),
            0,
            abi.encodeWithSignature("enableModule(address)", address(0xbeef)),
            Enum.Operation.Call
        );

        assertEq(owner.balance, 0); // sanity check
        assertEq(avatar.isModuleEnabled(address(0xbeef)), false); // sanity check
        avatarExecutionStrategy.execute(ProposalOutcome.Accepted, abi.encode(transactions));
        // owner should have received 1 wei
        assertEq(owner.balance, 1);
        // dummy module should have been enabled
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
        vm.expectRevert(TransactionsFailed.selector);
        avatarExecutionStrategy.execute(ProposalOutcome.Accepted, abi.encode(transactions));
        // both txs should have reverted despite the first one being valid
        assertEq(owner.balance, 0);
        assertEq(avatar.isModuleEnabled(address(0xbeef)), false);
    }

    function testInvalidTx() public {
        // This transaction will fail because the avatar does not have enough funds
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(address(owner), 1001, "", Enum.Operation.Call);

        vm.expectRevert(TransactionsFailed.selector);
        avatarExecutionStrategy.execute(ProposalOutcome.Accepted, abi.encode(transactions));
    }

    function testInvalidCaller() public {
        // Creating a transaction that will send 1 wei to the owner
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(address(owner), 1, "", Enum.Operation.Call);

        // Only whitelisted spaces can call the execute function
        vm.prank(unauthorized);
        vm.expectRevert(SpaceNotEnabled.selector);
        avatarExecutionStrategy.execute(ProposalOutcome.Accepted, abi.encode(transactions));
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
        // This space is already enabled
        address space = address(this);
        vm.prank(owner);
        vm.expectRevert(InvalidSpace.selector);
        avatarExecutionStrategy.enableSpace(space);
    }

    function testUnauthorizedEnableSpace() public {
        address space = address(0xbeef);
        vm.prank(unauthorized);
        vm.expectRevert("Ownable: caller is not the owner");
        avatarExecutionStrategy.enableSpace(space);
    }

    function testDisableSpace() public {
        address space = address(this);
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SpaceDisabled(space);
        avatarExecutionStrategy.disableSpace(space);
        assertEq(avatarExecutionStrategy.isSpaceEnabled(space), false);
    }

    function testDisableInvalidSpace() public {
        // This space is not enabled
        address space = address(0xbeef);
        vm.prank(owner);
        vm.expectRevert(InvalidSpace.selector);
        avatarExecutionStrategy.disableSpace(space);
    }

    function testUnauthorizedDisableSpace() public {
        address space = address(this);
        vm.prank(unauthorized);
        vm.expectRevert("Ownable: caller is not the owner");
        avatarExecutionStrategy.disableSpace(space);
    }
}

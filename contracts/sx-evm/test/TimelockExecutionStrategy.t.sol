// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Choice, Enum, IndexedStrategy, MetaTransaction, ProposalStatus, Strategy, Proposal } from "../src/types.sol";
import { TimelockExecutionStrategy } from "../src/execution-strategies/TimelockExecutionStrategy.sol";
import { MockImplementation } from "./mocks/MockImplementation.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { TestERC1155 } from "./mocks/TestERC1155.sol";
import { TestERC721 } from "./mocks/TestERC721.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/interfaces/IERC1155Receiver.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";

abstract contract TimelockExecutionStrategyTest is SpaceTest {
    error InvalidSpace();
    error TimelockDelayNotMet();
    error ProposalNotQueued();
    error DuplicateExecutionPayloadHash();
    error OnlyVetoGuardian();
    event TimelockExecutionStrategySetUp(
        address owner,
        address vetoGuardian,
        address[] spaces,
        uint256 quorum,
        uint256 timelockDelay
    );
    event TransactionQueued(MetaTransaction transaction, uint256 executionTime);
    event ProposalVetoed(bytes32 executionPayloadHash);
    event VetoGuardianSet(address vetoGuardian, address newVetoGuardian);

    TimelockExecutionStrategy public timelockExecutionStrategy;

    address public vetoGuardian = address(0);
    address public recipient = address(0xc0ffee);

    function testQueueingFromUnauthorizedSpace() external {
        timelockExecutionStrategy.disableSpace(address(space));

        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
        );
        uint256 proposalId2 = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            new bytes(0)
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
            new bytes(0)
        );
        uint256 proposalId2 = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions2)),
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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
            new bytes(0)
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

    function testVetoUnqueuedProposal() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            new bytes(0)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        // Set veto guardian
        address vetoGuardian = address(0x7e20);
        timelockExecutionStrategy.setVetoGuardian(vetoGuardian);

        vm.prank(vetoGuardian);
        vm.expectRevert(ProposalNotQueued.selector);
        timelockExecutionStrategy.veto(keccak256(abi.encode(transactions)));
    }

    function testVetoOnlyGuardian() external {
        MetaTransaction[] memory transactions = new MetaTransaction[](1);
        transactions[0] = MetaTransaction(recipient, 1, "", Enum.Operation.Call, 0);
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            new bytes(0)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        space.execute(proposalId, abi.encode(transactions));

        address vetoGuardian = address(0x7e20);
        vm.prank(vetoGuardian);
        vm.expectRevert(OnlyVetoGuardian.selector);
        timelockExecutionStrategy.veto(keccak256(abi.encode(transactions)));
    }

    function testExecuteNFTs() external {
        TestERC1155 erc1155 = new TestERC1155();
        TestERC721 erc721 = new TestERC721();

        vm.startPrank(author);
        erc721.mint(author, 1);
        erc721.safeTransferFrom(author, address(timelockExecutionStrategy), 1);

        erc1155.mint(author, 1, 1);
        erc1155.safeTransferFrom(author, address(timelockExecutionStrategy), 1, 1, "");

        erc1155.mint(author, 2, 8);
        erc1155.mint(author, 3, 8);
        uint256[] memory ids = new uint256[](2);
        ids[0] = 2;
        ids[1] = 3;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 8;
        amounts[1] = 8;
        erc1155.safeBatchTransferFrom(author, address(timelockExecutionStrategy), ids, amounts, "");

        vm.stopPrank();

        MetaTransaction[] memory transactions = new MetaTransaction[](2);
        transactions[0] = MetaTransaction(
            address(erc721),
            0,
            abi.encodeWithSelector(erc721.transferFrom.selector, address(timelockExecutionStrategy), author, 1),
            Enum.Operation.Call,
            0
        );
        transactions[1] = MetaTransaction(
            address(erc1155),
            0,
            abi.encodeWithSelector(
                erc1155.safeTransferFrom.selector,
                address(timelockExecutionStrategy),
                author,
                1,
                1,
                ""
            ),
            Enum.Operation.Call,
            0
        );

        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            Strategy(address(timelockExecutionStrategy), abi.encode(transactions)),
            new bytes(0)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        vm.warp(block.timestamp + space.maxVotingDuration());

        vm.expectEmit(true, true, true, true);
        emit TransactionQueued(transactions[0], block.timestamp + 1000);
        space.execute(proposalId, abi.encode(transactions));

        assertEq(erc721.ownerOf(1), address(timelockExecutionStrategy));
        assertEq(erc1155.balanceOf(author, 1), 0);

        vm.warp(block.timestamp + timelockExecutionStrategy.timelockDelay());
        timelockExecutionStrategy.executeQueuedProposal(abi.encode(transactions));

        assertEq(erc721.ownerOf(1), address(author));
        assertEq(erc1155.balanceOf(author, 1), 1);
    }

    function testCheckViewFunctions() public {
        assertTrue(timelockExecutionStrategy.supportsInterface(type(IERC721Receiver).interfaceId));
        assertTrue(timelockExecutionStrategy.supportsInterface(type(IERC1155Receiver).interfaceId));
        assertEq(timelockExecutionStrategy.getStrategyType(), "SimpleQuorumTimelock");
    }

    function testSetUp() public {
        address[] memory spaces = new address[](1);
        spaces[0] = address(space);
        timelockExecutionStrategy = new TimelockExecutionStrategy(owner, vetoGuardian, spaces, 1000, quorum);

        assertEq(timelockExecutionStrategy.owner(), owner);
        assertEq(timelockExecutionStrategy.vetoGuardian(), vetoGuardian);
        assertEq(timelockExecutionStrategy.quorum(), quorum);
        assertEq(timelockExecutionStrategy.timelockDelay(), 1000);
        assertEq(timelockExecutionStrategy.isSpaceEnabled(address(space)), true);
    }
}

contract TimelockExecutionStrategyTestDirect is TimelockExecutionStrategyTest {
    function setUp() public override {
        super.setUp();

        address[] memory spaces = new address[](1);
        spaces[0] = address(space);

        timelockExecutionStrategy = new TimelockExecutionStrategy(owner, vetoGuardian, spaces, 1000, quorum);
        vm.deal(address(owner), 1000);
        payable(timelockExecutionStrategy).transfer(1000);
    }
}

contract TimelockExecutionStrategyTestProxy is TimelockExecutionStrategyTest {
    function setUp() public override {
        super.setUp();

        address[] memory spaces = new address[](1);
        spaces[0] = address(space);
        address[] memory emptyArray = new address[](1);
        TimelockExecutionStrategy masterExecutionStrategy = new TimelockExecutionStrategy(
            address(1),
            address(0),
            emptyArray,
            0,
            0
        );

        timelockExecutionStrategy = TimelockExecutionStrategy(
            payable(
                new ERC1967Proxy(
                    address(masterExecutionStrategy),
                    abi.encodeWithSelector(
                        TimelockExecutionStrategy.setUp.selector,
                        abi.encode(owner, vetoGuardian, spaces, 1000, quorum)
                    )
                )
            )
        );
        vm.deal(address(owner), 1000);
        payable(timelockExecutionStrategy).transfer(1000);
    }
}

// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Choice, IndexedStrategy, Proposal, ProposalStatus, Strategy, UpdateSettingsCalldata } from "../src/types.sol";
import { EmergencyQuorumExecutionStrategy } from "../src/execution-strategies/EmergencyQuorumExecutionStrategy.sol";

contract EmergencyQuorumExec is EmergencyQuorumExecutionStrategy {
    uint256 internal numExecuted;

    constructor(address _owner, uint256 _quorum, uint256 _emergencyQuorum) {
        setUp(abi.encode(_owner, _quorum, _emergencyQuorum));
    }

    function setUp(bytes memory initParams) public initializer {
        (address _owner, uint256 _quorum, uint256 _emergencyQuorum) = abi.decode(
            initParams,
            (address, uint256, uint256)
        );
        __Ownable_init();
        transferOwnership(_owner);
        __EmergencyQuorumExecutionStrategy_init(_quorum, _emergencyQuorum);
    }

    function execute(
        uint256 proposalId,
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        bytes memory payload
    ) external override {
        ProposalStatus proposalStatus = getProposalStatus(proposal, votesFor, votesAgainst, votesAbstain);
        if ((proposalStatus != ProposalStatus.Accepted) && (proposalStatus != ProposalStatus.VotingPeriodAccepted)) {
            revert InvalidProposalStatus(proposalStatus);
        }
        numExecuted++;
    }

    function getStrategyType() external pure returns (string memory) {
        return "EmergencyQuorumExecution";
    }
}

contract EmergencyQuorumTest is SpaceTest {
    event EmergencyQuorumUpdated(uint256 newEmergencyQuorum);
    event QuorumUpdated(uint256 newQuorum);

    Strategy internal emergencyStrategy;
    uint256 internal emergencyQuorum = 2;
    EmergencyQuorumExec internal emergency;

    function setUp() public override {
        super.setUp();

        emergency = new EmergencyQuorumExec(owner, quorum, emergencyQuorum);
        emergencyStrategy = Strategy(address(emergency), new bytes(0));

        minVotingDuration = 100;
        space.updateSettings(
            UpdateSettingsCalldata(
                minVotingDuration,
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
    }

    function testEmergencyQuorum() public {
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 1
        _vote(address(42), proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 2

        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, emergencyStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testEmergencyQuorumNotReached() public {
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 1

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, uint8(ProposalStatus.VotingPeriod)));
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testEmergencyQuorumAfterMinDuration() public {
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 1

        vm.roll(block.number + minVotingDuration);

        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testEmergencyQuorumAfterMaxDuration() public {
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 1

        vm.roll(block.number + maxVotingDuration);

        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testEmergencyQuorumReachedButRejected() public {
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );

        // Cast two votes AGAINST
        _vote(author, proposalId, Choice.Against, userVotingStrategies, voteMetadataURI); // 1
        _vote(address(42), proposalId, Choice.Against, userVotingStrategies, voteMetadataURI); // 2

        // EmergencyQuorum should've been reached but with only `AGAINST` votes, so proposal status should be
        // `VotingPeriod`.
        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, uint8(ProposalStatus.VotingPeriod)));
        space.execute(proposalId, emergencyStrategy.params);

        // Now forward to `maxEndTimestamp`, the proposal should be finalized and `Rejected`.
        vm.roll(block.number + maxVotingDuration);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, uint8(ProposalStatus.Rejected)));
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testEmergencyQuorumLowerThanQuorum() public {
        EmergencyQuorumExec emergencyQuorumExec = new EmergencyQuorumExec(owner, quorum, quorum - 1);

        emergencyStrategy = Strategy(address(emergencyQuorumExec), new bytes(0));

        // Create proposal and vote
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // emergencyQuorum reached
        vm.roll(block.number + maxVotingDuration);

        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testEmergencyQuorumVotingPeriod() public {
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );

        // Cast two votes AGAINST
        _vote(author, proposalId, Choice.Against, userVotingStrategies, voteMetadataURI); // 1
        _vote(address(42), proposalId, Choice.Against, userVotingStrategies, voteMetadataURI); // 2

        // EmergencyQuorum should've been reached but with only `AGAINST` votes, so proposal status should be
        // `VotingPeriod`.
        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, uint8(ProposalStatus.VotingPeriod)));
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testEmergencyQuorumCancelled() public {
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 1

        space.cancel(proposalId);

        vm.expectRevert(abi.encodeWithSelector(ProposalFinalized.selector));
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testEmergencyQuorumAlreadyExecuted() public {
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 1

        vm.roll(block.number + minVotingDuration);

        space.execute(proposalId, emergencyStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(ProposalFinalized.selector));
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testGetStrategyType() public {
        assertEq(emergency.getStrategyType(), "EmergencyQuorumExecution");
    }

    function testEmergencyQuorumSetEmergencyQuorum() public {
        uint256 newEmergencyQuorum = 4; // emergencyQuorum * 2

        vm.expectEmit(true, true, true, true);
        emit EmergencyQuorumUpdated(newEmergencyQuorum);
        emergency.setEmergencyQuorum(newEmergencyQuorum);

        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 1
        _vote(address(42), proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 2

        // The proposal should not be executed because the new emergency quorum hasn't been reached yet.
        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.VotingPeriod));
        space.execute(proposalId, emergencyStrategy.params);

        _vote(address(43), proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 3
        _vote(address(44), proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 4

        // EmergencyQuorum has been reached; the proposal should get executed!
        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, emergencyStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testEmergencyQuorumSetEmergencyQuorumUnauthorized() public {
        uint256 newEmergencyQuorum = 4; // emergencyQuorum * 2
        vm.prank(address(0xdeadbeef));
        vm.expectRevert("Ownable: caller is not the owner");
        emergency.setEmergencyQuorum(newEmergencyQuorum);
    }

    function testEmergencyQuorumSetQuorum() public {
        uint256 newQuorum = quorum * 2; // 2

        vm.expectEmit(true, true, true, true);
        emit QuorumUpdated(newQuorum);
        emergency.setQuorum(newQuorum);

        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 1

        // Warp to the minimum voting duration
        vm.warp(block.timestamp + minVotingDuration);

        // The proposal should not be executed because the new emergency quorum hasn't been reached yet.
        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.VotingPeriod));
        space.execute(proposalId, emergencyStrategy.params);

        _vote(address(42), proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // 2

        // Quorum has been reached; the proposal should get executed!
        vm.expectEmit(true, true, true, true);
        emit ProposalExecuted(proposalId);
        space.execute(proposalId, emergencyStrategy.params);

        assertEq(uint8(space.getProposalStatus(proposalId)), uint8(ProposalStatus.Executed));
    }

    function testEmergencyQuorumSetQuorumUnauthorized() public {
        uint256 newQuorum = quorum * 2; // 2
        vm.prank(address(0xdeadbeef));
        vm.expectRevert("Ownable: caller is not the owner");
        emergency.setQuorum(newQuorum);
    }
}

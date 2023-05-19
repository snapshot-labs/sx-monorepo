// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Choice, IndexedStrategy, Proposal, ProposalStatus, Strategy, UpdateSettingsInput } from "../src/types.sol";
import { EmergencyQuorumStrategy } from "../src/execution-strategies/EmergencyQuorumStrategy.sol";

contract EmergencyQuorumExec is EmergencyQuorumStrategy {
    uint256 internal numExecuted;

    // solhint-disable-next-line no-empty-blocks
    constructor(uint256 _quorum, uint256 _emergencyQuorum) EmergencyQuorumStrategy(_quorum, _emergencyQuorum) {}

    function execute(
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
        // Check that the execution payload matches the payload supplied when the proposal was created
        if (proposal.executionPayloadHash != keccak256(payload)) revert InvalidPayload();
        numExecuted++;
    }

    function getStrategyType() external pure returns (string memory) {
        return "EmergencyQuorumExecution";
    }
}

contract EmergencyQuorumTest is SpaceTest {
    Strategy internal emergencyStrategy;
    uint256 internal emergencyQuorum = 2;
    EmergencyQuorumExec internal emergency;

    function setUp() public override {
        super.setUp();

        emergency = new EmergencyQuorumExec(quorum, emergencyQuorum);
        emergencyStrategy = Strategy(address(emergency), new bytes(0));

        minVotingDuration = 100;
        space.updateSettings(
            UpdateSettingsInput(
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

        vm.warp(block.timestamp + minVotingDuration);

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

        vm.warp(block.timestamp + maxVotingDuration);

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
        vm.warp(block.timestamp + maxVotingDuration);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, uint8(ProposalStatus.Rejected)));
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testEmergencyQuorumLowerThanQuorum() public {
        EmergencyQuorumExec emergencyQuorumExec = new EmergencyQuorumExec(quorum, quorum - 1);

        emergencyStrategy = Strategy(address(emergencyQuorumExec), new bytes(0));

        // Create proposal and vote
        uint256 proposalId = _createProposal(
            author,
            proposalMetadataURI,
            emergencyStrategy,
            abi.encode(userVotingStrategies)
        );
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI); // emergencyQuorum reached
        vm.warp(block.timestamp + maxVotingDuration);

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

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, uint8(ProposalStatus.Cancelled)));
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

        vm.warp(block.timestamp + minVotingDuration);

        space.execute(proposalId, emergencyStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, uint8(ProposalStatus.Executed)));
        space.execute(proposalId, emergencyStrategy.params);
    }

    function testGetStrategyType() public {
        assertEq(emergency.getStrategyType(), "EmergencyQuorumExecution");
    }
}

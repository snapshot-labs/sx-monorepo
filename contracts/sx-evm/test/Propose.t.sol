// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { FinalizationStatus, IndexedStrategy, Proposal, Strategy } from "../src/types.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { IExecutionStrategy } from "src/interfaces/IExecutionStrategy.sol";
import { StupidProposalValidationStrategy } from "./mocks/StupidProposalValidation.sol";

contract ProposeTest is SpaceTest {
    error DuplicateFound(uint8 index);

    function testPropose() public {
        uint256 proposalId = space.nextProposalId();

        // There is only one voting strategy, so the `activeVotingStrategies` bit array should be ..001 = 1
        uint256 activeVotingStrategies = 1;

        // Expected content of the proposal struct
        Proposal memory proposal = Proposal(
            uint32(block.timestamp),
            uint32(block.timestamp + votingDelay),
            uint32(block.timestamp + votingDelay + minVotingDuration),
            uint32(block.timestamp + votingDelay + maxVotingDuration),
            keccak256(abi.encodePacked(executionStrategy.params)),
            IExecutionStrategy(executionStrategy.addr),
            author,
            FinalizationStatus.Pending,
            activeVotingStrategies
        );

        vm.expectEmit(true, true, true, true);
        emit ProposalCreated(proposalId, author, proposal, proposalMetadataURI, executionStrategy.params);

        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // Actual content of the proposal struct
        (
            uint32 _snapshotTimestamp,
            uint32 _startTimestamp,
            uint32 _minEndTimestamp,
            uint32 _maxEndTimestamp,
            bytes32 _executionPayloadHash,
            IExecutionStrategy _executionStrategy,
            address _author,
            FinalizationStatus _finalizationStatus,
            uint256 _activeVotingStrategies
        ) = space.proposals(proposalId);

        Proposal memory _proposal = Proposal(
            _snapshotTimestamp,
            _startTimestamp,
            _minEndTimestamp,
            _maxEndTimestamp,
            _executionPayloadHash,
            IExecutionStrategy(_executionStrategy),
            _author,
            _finalizationStatus,
            _activeVotingStrategies
        );

        // Proposal memory _proposal = space.proposalRegistry(proposalId);

        // Checking expectations and actual values match
        assertEq(keccak256(abi.encode(_proposal)), keccak256(abi.encode(proposal)));
    }

    function testProposeInvalidAuth() public {
        //  Using this contract as an authenticator, which is not whitelisted
        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector));
        space.propose(author, proposalMetadataURI, executionStrategy, abi.encode(userVotingStrategies));
    }

    function testProposeRefusedValidation() public {
        StupidProposalValidationStrategy stupidProposalValidationStrategy = new StupidProposalValidationStrategy();
        Strategy memory validationStrategy = Strategy(address(stupidProposalValidationStrategy), new bytes(0));
        space.setProposalValidationStrategy(validationStrategy);

        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
    }
}

// SPDX-License-Identifier: UNLICENSED
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

        bytes32 executionHash = keccak256(abi.encodePacked(executionStrategy.params));
        uint32 snapshotTimestamp = uint32(block.timestamp);
        uint32 startTimestamp = uint32(snapshotTimestamp + votingDelay);
        uint32 minEndTimestamp = uint32(startTimestamp + minVotingDuration);
        uint32 maxEndTimestamp = uint32(startTimestamp + maxVotingDuration);

        // There is only one voting strategy, so the `activeVotingStrategies` bit array should be ..001 = 1
        uint256 activeVotingStrategies = 1;

        // Expected content of the proposal struct
        Proposal memory proposal = Proposal(
            snapshotTimestamp,
            startTimestamp,
            minEndTimestamp,
            maxEndTimestamp,
            executionHash,
            IExecutionStrategy(executionStrategy.addr),
            author,
            FinalizationStatus.Pending,
            activeVotingStrategies
        );

        vm.expectEmit(true, true, true, true);
        emit ProposalCreated(proposalId, author, proposal, proposalMetadataURI, executionStrategy.params);

        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // Actual content of the proposal struct
        Proposal memory _proposal = space.getProposal(proposalId);

        // Checking expectations and actual values match
        assertEq(keccak256(abi.encode(_proposal)), keccak256(abi.encode(proposal)));
    }

    function testProposeInvalidAuth() public {
        //  Using this contract as an authenticator, which is not whitelisted
        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
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

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { FinalizationStatus, IndexedStrategy, Proposal, Strategy } from "../src/types.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { IExecutionStrategy } from "src/interfaces/IExecutionStrategy.sol";
import { StupidProposalValidationStrategy } from "./mocks/StupidProposalValidation.sol";

contract ProposeTest is SpaceTest {
    error DuplicateFound(uint8 index);
    error InvalidStrategyIndex(uint256 index);

    function testPropose() public {
        uint256 proposalId = space.nextProposalId();

        bytes32 executionHash = keccak256(abi.encodePacked(executionStrategy.params));
        uint32 snapshotTimestamp = uint32(block.timestamp);
        uint32 startTimestamp = uint32(snapshotTimestamp + votingDelay);
        uint32 minEndTimestamp = uint32(startTimestamp + minVotingDuration);
        uint32 maxEndTimestamp = uint32(startTimestamp + maxVotingDuration);

        // Expected content of the proposal struct
        Proposal memory proposal = Proposal(
            snapshotTimestamp,
            startTimestamp,
            minEndTimestamp,
            maxEndTimestamp,
            executionHash,
            IExecutionStrategy(executionStrategy.addy),
            author,
            FinalizationStatus.Pending,
            votingStrategies
        );

        vm.expectEmit(true, true, true, true);
        emit ProposalCreated(proposalId, author, proposal, proposalMetadataURI, executionStrategy.params);

        _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

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

    function testProposeInvalidUserVotingStrategy() public {
        IndexedStrategy[] memory invalidUsedStrategies = new IndexedStrategy[](1);
        invalidUsedStrategies[0] = IndexedStrategy(42, new bytes(0));

        // out of bounds revert
        vm.expectRevert();
        _createProposal(author, proposalMetadataURI, executionStrategy, invalidUsedStrategies);
    }

    function testProposeRefusedValidation() public {
        StupidProposalValidationStrategy stupidProposalValidationStrategy = new StupidProposalValidationStrategy();
        Strategy memory validationStrategy = Strategy(address(stupidProposalValidationStrategy), new bytes(0));
        space.setProposalValidationStrategy(validationStrategy);

        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);
    }

    function testProposeDuplicateUserVotingStrategy() public {
        IndexedStrategy[] memory invalidUsedStrategies = new IndexedStrategy[](4);
        invalidUsedStrategies[0] = IndexedStrategy(0, new bytes(0));
        invalidUsedStrategies[1] = IndexedStrategy(1, new bytes(0));
        invalidUsedStrategies[2] = IndexedStrategy(2, new bytes(0));
        invalidUsedStrategies[3] = IndexedStrategy(0, new bytes(0)); // Duplicate index

        vm.expectRevert(abi.encodeWithSelector(DuplicateFound.selector, 0));
        _createProposal(author, proposalMetadataURI, executionStrategy, invalidUsedStrategies);
    }

    function testProposeMultipleVotingStrategies() public {
        VanillaVotingStrategy strat2 = new VanillaVotingStrategy();
        Strategy[] memory toAdd = new Strategy[](2);
        toAdd[0] = Strategy(address(strat2), new bytes(0));
        toAdd[1] = Strategy(address(strat2), new bytes(0));
        string[] memory newVotingStrategyMetadataURIs = new string[](2);

        space.addVotingStrategies(toAdd, newVotingStrategyMetadataURIs);

        IndexedStrategy[] memory newVotingStrategies = new IndexedStrategy[](3);
        newVotingStrategies[0] = userVotingStrategies[0]; // base strat
        newVotingStrategies[1] = IndexedStrategy(1, new bytes(0)); // strat2
        newVotingStrategies[2] = IndexedStrategy(2, new bytes(0)); // strat3

        _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);
    }
}

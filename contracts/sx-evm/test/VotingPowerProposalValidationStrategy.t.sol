// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Strategy, IndexedStrategy } from "../src/types.sol";
import { CompVotingStrategy } from "../src/voting-strategies/CompVotingStrategy.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import {
    VotingPowerProposalValidationStrategy
} from "../src/proposal-validation-strategies/VotingPowerProposalValidationStrategy.sol";
import { CompToken } from "./mocks/CompToken.sol";

contract VotingPowerProposalValidationTest is SpaceTest {
    error DuplicateFound(uint8 index);
    uint256 internal proposalThreshold = 100;
    CompToken internal compToken;
    IndexedStrategy[] internal userPropositionPowerStrategies;

    function setUp() public virtual override {
        super.setUp();

        compToken = new CompToken();
        compToken.mint(author, 100);
        vm.prank(author);
        compToken.delegate(author);
        vm.roll(block.number + 1);

        Strategy memory compVotingStrategy = Strategy(
            address(new CompVotingStrategy()),
            abi.encodePacked(address(compToken))
        );
        Strategy[] memory propositionPowerStrategies = new Strategy[](1);
        propositionPowerStrategies[0] = compVotingStrategy;

        Strategy memory votingPowerProposalValidationStrategy = Strategy(
            address(new VotingPowerProposalValidationStrategy()),
            abi.encode(proposalThreshold, propositionPowerStrategies)
        );
        space.setProposalValidationStrategy(votingPowerProposalValidationStrategy);

        // The Comp token strategy is at index 0 of the proposal validation strategies
        userPropositionPowerStrategies.push(IndexedStrategy(0, new bytes(0)));
    }

    function testPropose() public {
        _createProposal(author, proposalMetadataURI, executionStrategy, abi.encode(userPropositionPowerStrategies));
    }

    function testProposeInsufficientVotingPower() public {
        vm.prank(author);
        compToken.burn(author, 1); // Voting power of the author is now 99 when the proposal threshold is 100
        vm.roll(block.number + 1);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, abi.encode(userPropositionPowerStrategies));
    }

    function testProposeInvalidUserVotingStrategy() public {
        IndexedStrategy[] memory invalidUserPropositionPowerStrategies = new IndexedStrategy[](1);
        invalidUserPropositionPowerStrategies[0] = IndexedStrategy(42, new bytes(0));

        // out of bounds revert
        vm.expectRevert();
        _createProposal(
            author,
            proposalMetadataURI,
            executionStrategy,
            abi.encode(invalidUserPropositionPowerStrategies)
        );
    }

    function testProposeDuplicateUserVotingStrategy() public {
        IndexedStrategy[] memory invalidUserPropositionPowerStrategies = new IndexedStrategy[](4);
        invalidUserPropositionPowerStrategies[0] = IndexedStrategy(0, new bytes(0));
        invalidUserPropositionPowerStrategies[1] = IndexedStrategy(1, new bytes(0));
        invalidUserPropositionPowerStrategies[2] = IndexedStrategy(2, new bytes(0));
        invalidUserPropositionPowerStrategies[3] = IndexedStrategy(0, new bytes(0)); // Duplicate index

        vm.expectRevert(abi.encodeWithSelector(DuplicateFound.selector, 0));
        _createProposal(
            author,
            proposalMetadataURI,
            executionStrategy,
            abi.encode(invalidUserPropositionPowerStrategies)
        );
    }

    function testProposeMultipleVotingStrategies() public {
        // Using 2 vanilla strategies for proposition power
        VanillaVotingStrategy additionalStrategy = new VanillaVotingStrategy();
        Strategy[] memory propositionPowerStrategies = new Strategy[](2);
        propositionPowerStrategies[0] = Strategy(address(additionalStrategy), new bytes(0));
        propositionPowerStrategies[1] = Strategy(address(additionalStrategy), new bytes(0));

        // Using a proposal threshold of 2
        Strategy memory votingPowerProposalValidationStrategy = Strategy(
            address(new VotingPowerProposalValidationStrategy()),
            abi.encode(2, propositionPowerStrategies)
        );
        space.setProposalValidationStrategy(votingPowerProposalValidationStrategy);

        IndexedStrategy[] memory newUserPropositionPowerStrategies = new IndexedStrategy[](2);
        newUserPropositionPowerStrategies[0] = IndexedStrategy(0, new bytes(0));
        newUserPropositionPowerStrategies[1] = IndexedStrategy(1, new bytes(0));

        _createProposal(author, proposalMetadataURI, executionStrategy, abi.encode(newUserPropositionPowerStrategies));
    }
}

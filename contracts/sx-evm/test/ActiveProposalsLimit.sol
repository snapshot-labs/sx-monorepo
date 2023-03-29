// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Strategy } from "../src/types.sol";
import { ActiveProposalsLimiterVanilla } from "./mocks/ActiveProposalsLimiterVanilla.sol";

contract ActiveProposalsVanilla is SpaceTest {
    ActiveProposalsLimiterVanilla internal spamProtec;
    uint224 internal maxActive;
    uint32 internal cooldown;

    function setUp() public override {
        super.setUp();

        maxActive = 5;
        cooldown = 1 weeks;

        spamProtec = new ActiveProposalsLimiterVanilla(1 weeks, 5);

        space.setProposalValidationStrategy(Strategy(address(spamProtec), new bytes(0)));
    }

    function testSpamOneProposal() public {
        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
    }

    function testSpamMinusOneProposals() public {
        for (uint256 i = 0; i < maxActive; i++) {
            _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        }
    }

    function testSpamMaxProposals() public {
        for (uint256 i = 0; i < maxActive; i++) {
            _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        }

        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
    }

    function testSpamOverLongPeriod() public {
        // max * 2 so we would revert if `cooldown` is not respected
        for (uint256 i = 0; i < maxActive * 2; i++) {
            _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
            vm.warp(block.timestamp + cooldown);
        }
    }

    function testSpamThenWaitThenSpam() public {
        // max * 2 so we would revert if `cooldown` is not respected
        for (uint256 i = 0; i < maxActive; i++) {
            _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        }

        // Advance until half of cooldown
        vm.warp(block.timestamp + cooldown / 2);

        // Should still fail
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // Advance until ALMOST full cooldown has elapsed
        vm.warp(block.timestamp + cooldown / 2 - 1);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // Advance until full cooldown has elapsed
        vm.warp(block.timestamp + 1);
        // We should be able to create `maxActive` proposals now
        for (uint256 i = 0; i < maxActive; i++) {
            _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        }
    }
}

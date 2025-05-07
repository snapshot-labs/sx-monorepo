// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Strategy, UpdateSettingsCalldata } from "../src/types.sol";
import {
    ActiveProposalsLimiterProposalValidationStrategy
} from "../src/proposal-validation-strategies/ActiveProposalsLimiterProposalValidationStrategy.sol";

contract ActiveProposalsLimterTest is SpaceTest {
    ActiveProposalsLimiterProposalValidationStrategy internal activeProposalsLimiterProposalValidationStrategy;
    uint224 internal maxActive;
    uint32 internal cooldown;

    function setUp() public override {
        super.setUp();

        maxActive = 5;
        cooldown = 1 weeks;

        activeProposalsLimiterProposalValidationStrategy = new ActiveProposalsLimiterProposalValidationStrategy();

        Strategy memory newProposalStrategy = Strategy(
            address(activeProposalsLimiterProposalValidationStrategy),
            abi.encode(cooldown, maxActive)
        );
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                newProposalStrategy,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
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
            vm.warp(vm.getBlockTimestamp() + cooldown);
        }
    }

    // TODO: Increase Proposal Limit
    function testDecreaseProposalLimit() public {
        // The user goes to the maxActiveLimit.
        for (uint256 i = 0; i < maxActive; i++) {
            _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        }

        // We now decrease the limit to 1.
        Strategy memory newProposalStrategy = Strategy(
            address(activeProposalsLimiterProposalValidationStrategy),
            abi.encode(cooldown, 1) // Set the max number of proposals to 1
        );
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                newProposalStrategy,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        // Ensure the user cannot cast new proposals
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
    }

    function testSpamThenWaitThenSpam() public {
        // max * 2 so we would revert if `cooldown` is not respected
        for (uint256 i = 0; i < maxActive; i++) {
            _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        }

        // Advance until half of cooldown
        vm.warp(vm.getBlockTimestamp() + cooldown / 2);

        // Should still fail
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // Advance until ALMOST full cooldown has elapsed
        vm.warp(vm.getBlockTimestamp() + cooldown / 2 - 1);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // Advance until full cooldown has elapsed
        vm.warp(vm.getBlockTimestamp() + 1);
        // We should be able to create `maxActive` proposals now
        for (uint256 i = 0; i < maxActive; i++) {
            _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        }
    }
}

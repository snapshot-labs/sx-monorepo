// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Strategy, IndexedStrategy, UpdateSettingsCalldata } from "../src/types.sol";
import { PropositionPowerAndActiveProposalsLimiterValidationStrategy } from "../src/proposal-validation-strategies/PropositionPowerAndActiveProposalsLimiterValidationStrategy.sol";

contract PropositionPowerWithCooldownTest is SpaceTest {
    PropositionPowerAndActiveProposalsLimiterValidationStrategy internal validator;
    Strategy[] internal allowedStrategies;
    uint256 internal constant COOLDOWN = 1 weeks;

    function setUp() public override {
        super.setUp();
        vm.warp(1_000_000);
        validator = new PropositionPowerAndActiveProposalsLimiterValidationStrategy();
        allowedStrategies.push(Strategy(address(vanillaVotingStrategy), hex"00"));
        _configure(COOLDOWN, 2, 1);
    }

    function _configure(uint256 cooldown, uint256 limit, uint256 threshold) internal {
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                Strategy(address(validator), abi.encode(cooldown, limit, threshold, allowedStrategies)),
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
    }

    function _propose(address proposer) internal returns (uint256) {
        return _createProposal(proposer, proposalMetadataURI, executionStrategy, abi.encode(userVotingStrategies));
    }

    function testThresholdAndLimitAndExactCooldown() public {
        _propose(author); // Exactly one power, equal to threshold.
        vm.warp(vm.getBlockTimestamp() + 100);
        _propose(author); // Restarts the timer.
        uint256 lastSuccess = vm.getBlockTimestamp();
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(author);
        vm.warp(lastSuccess + COOLDOWN - 1);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(author);
        vm.warp(lastSuccess + COOLDOWN);
        _propose(author);
        _propose(author);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(author);
    }

    function testRejectedPowerDoesNotConsumeCapacity() public {
        IndexedStrategy[] memory empty = new IndexedStrategy[](0);
        for (uint256 i = 0; i < 3; i++) {
            vm.expectRevert(FailedToPassProposalValidation.selector);
            _createProposal(author, proposalMetadataURI, executionStrategy, abi.encode(empty));
        }
        _propose(author);
        _propose(author);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(author);
    }

    function testRejectedPowerDoesNotRestartCooldown() public {
        _propose(author);
        uint256 lastSuccess = vm.getBlockTimestamp();
        vm.warp(lastSuccess + COOLDOWN - 1);
        _configure(COOLDOWN, 2, 2);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(author);
        _configure(COOLDOWN, 2, 1);
        vm.warp(lastSuccess + COOLDOWN);
        _propose(author);
        _propose(author);
    }

    function testPerAuthorAndPerSpaceIsolation() public {
        _propose(author);
        _propose(author);
        _propose(voter);
        _propose(voter);
        vm.prank(address(0x1234));
        assertTrue(
            validator.validate(author, abi.encode(COOLDOWN, 2, 1, allowedStrategies), abi.encode(userVotingStrategies))
        );
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(author);
    }

    function testCancellationDoesNotRestoreCapacity() public {
        uint256 proposalId = _propose(author);
        _propose(author);
        space.cancel(proposalId);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(author);
    }

    function testZeroCooldownDisablesLimit() public {
        _configure(0, 1, 1);
        for (uint256 i = 0; i < 4; i++) _propose(author);
    }

    function testZeroThresholdStillEnforcesLimit() public {
        _configure(COOLDOWN, 1, 0);
        IndexedStrategy[] memory empty = new IndexedStrategy[](0);
        _createProposal(author, proposalMetadataURI, executionStrategy, abi.encode(empty));
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(author, proposalMetadataURI, executionStrategy, abi.encode(empty));
    }

    function testZeroLimitReverts() public {
        _configure(COOLDOWN, 0, 1);
        vm.expectRevert(bytes4(keccak256("MaxActiveProposalsCannotBeZero()")));
        _propose(author);
    }

    function testDuplicateAndOutOfBoundsIndicesRevert() public {
        IndexedStrategy[] memory duplicate = new IndexedStrategy[](2);
        duplicate[0] = IndexedStrategy(0, hex"");
        duplicate[1] = IndexedStrategy(0, hex"");
        vm.expectRevert(abi.encodeWithSignature("DuplicateFound(uint8)", 0));
        _createProposal(author, proposalMetadataURI, executionStrategy, abi.encode(duplicate));
        userVotingStrategies[0].index = 1;
        vm.expectRevert();
        _propose(author);
    }

    function testOnlyControllerCanChangeValidator() public {
        vm.prank(unauthorized);
        vm.expectRevert("Ownable: caller is not the owner");
        _configure(COOLDOWN, 100, 0);
    }
}

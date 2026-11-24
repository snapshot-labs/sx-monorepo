// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Strategy, IndexedStrategy, UpdateSettingsCalldata } from "../src/types.sol";
import { CompVotingStrategy } from "../src/voting-strategies/CompVotingStrategy.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { PropositionPowerAndActiveProposalsLimiterValidationStrategyV2 } from "../src/proposal-validation-strategies/PropositionPowerAndActiveProposalsLimiterValidationStrategyV2.sol";
import { IProposalValidationStrategy } from "../src/interfaces/IProposalValidationStrategy.sol";
import { CompToken } from "./mocks/CompToken.sol";

contract PropositionPowerAndActiveProposalsLimiterValidationV2Test is SpaceTest {
    error DuplicateFound(uint8 index);
    error InvalidBlockNumber(uint32 blockNumber);

    uint256 internal proposalThreshold = 100;
    uint32 internal maxBlockAge = 256;
    uint256 internal cooldown; // 0 disables the active proposals limit
    uint256 internal maxActiveProposals = 1;
    CompToken internal compToken;
    Strategy internal compVotingStrategy;
    IndexedStrategy[] internal userPropositionPowerStrategies;

    function setUp() public virtual override {
        super.setUp();

        compToken = new CompToken();
        compToken.mint(author, 100);
        vm.prank(author);
        compToken.delegate(author);
        vm.roll(vm.getBlockNumber() + 1);

        compVotingStrategy = Strategy(address(new CompVotingStrategy()), abi.encodePacked(address(compToken)));
        _setCompStrategy();

        // The Comp token strategy is at index 0 of the proposal validation strategies
        userPropositionPowerStrategies.push(IndexedStrategy(0, new bytes(0)));
    }

    function _setPropositionPowerStrategies(uint256 threshold, Strategy[] memory strategies) internal {
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                Strategy(
                    address(new PropositionPowerAndActiveProposalsLimiterValidationStrategyV2()),
                    abi.encode(cooldown, maxActiveProposals, threshold, strategies, maxBlockAge)
                ),
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
    }

    function _setCompStrategy() internal {
        Strategy[] memory strategies = new Strategy[](1);
        strategies[0] = compVotingStrategy;
        _setPropositionPowerStrategies(proposalThreshold, strategies);
    }

    function _propose(uint256 blockNumber) internal {
        _createProposal(
            author,
            proposalMetadataURI,
            executionStrategy,
            abi.encode(uint32(blockNumber), userPropositionPowerStrategies)
        );
    }

    function testPropose() public {
        _propose(vm.getBlockNumber());
    }

    function testProposeWithoutCooldown() public {
        _propose(vm.getBlockNumber());
        _propose(vm.getBlockNumber());
        _propose(vm.getBlockNumber());
    }

    function testProposeCooldown() public {
        cooldown = 1 days;
        _setCompStrategy();

        _propose(vm.getBlockNumber());
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(vm.getBlockNumber());
        vm.warp(vm.getBlockTimestamp() + 1 days);
        _propose(vm.getBlockNumber());
    }

    function testProposeInsufficientVotingPower() public {
        vm.prank(author);
        compToken.burn(author, 1); // Voting power of the author is now 99 when the proposal threshold is 100
        vm.roll(vm.getBlockNumber() + 1);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(vm.getBlockNumber());
    }

    function testProposeAtRecentBlock() public {
        uint256 recentBlock = vm.getBlockNumber();
        vm.prank(author);
        compToken.burn(author, 100);
        vm.roll(vm.getBlockNumber() + 10);

        // The author had enough voting power at the recent block, not at the current one
        _propose(recentBlock);
        vm.expectRevert(FailedToPassProposalValidation.selector);
        _propose(vm.getBlockNumber());
    }

    function testProposeAtMaxBlockAge() public {
        vm.roll(vm.getBlockNumber() + maxBlockAge);
        _propose(vm.getBlockNumber() - maxBlockAge);
    }

    function testProposeBlockTooOld() public {
        vm.roll(vm.getBlockNumber() + maxBlockAge + 1);
        uint32 blockNumber = uint32(vm.getBlockNumber() - maxBlockAge - 1);
        vm.expectRevert(abi.encodeWithSelector(InvalidBlockNumber.selector, blockNumber));
        _propose(blockNumber);
    }

    function testProposeFutureBlock() public {
        uint32 blockNumber = uint32(vm.getBlockNumber() + 1);
        vm.expectRevert(abi.encodeWithSelector(InvalidBlockNumber.selector, blockNumber));
        _propose(blockNumber);
    }

    function testFuzzProposeBlockNumber(uint256 blockNumber) public {
        vm.roll(vm.getBlockNumber() + 2 * maxBlockAge);
        uint256 currentBlock = vm.getBlockNumber();
        blockNumber = bound(blockNumber, currentBlock - 2 * maxBlockAge, currentBlock + maxBlockAge);

        if (blockNumber > currentBlock || currentBlock - blockNumber > maxBlockAge) {
            vm.expectRevert(abi.encodeWithSelector(InvalidBlockNumber.selector, uint32(blockNumber)));
        }
        _propose(blockNumber);
    }

    function testProposeInvalidUserVotingStrategy() public {
        userPropositionPowerStrategies[0] = IndexedStrategy(42, new bytes(0));

        // out of bounds revert
        vm.expectRevert();
        _propose(vm.getBlockNumber());
    }

    function testProposeDuplicateUserVotingStrategy() public {
        userPropositionPowerStrategies.push(IndexedStrategy(1, new bytes(0)));
        userPropositionPowerStrategies.push(IndexedStrategy(2, new bytes(0)));
        userPropositionPowerStrategies.push(IndexedStrategy(0, new bytes(0))); // Duplicate index

        vm.expectRevert(abi.encodeWithSelector(DuplicateFound.selector, 0));
        _propose(vm.getBlockNumber());
    }

    function testProposeMultipleVotingStrategies() public {
        // Using 2 vanilla strategies for proposition power, with a proposal threshold of 2
        VanillaVotingStrategy additionalStrategy = new VanillaVotingStrategy();
        Strategy[] memory propositionPowerStrategies = new Strategy[](2);
        propositionPowerStrategies[0] = Strategy(address(additionalStrategy), new bytes(0));
        propositionPowerStrategies[1] = Strategy(address(additionalStrategy), new bytes(0));
        _setPropositionPowerStrategies(2, propositionPowerStrategies);

        userPropositionPowerStrategies.push(IndexedStrategy(1, new bytes(0)));
        _propose(vm.getBlockNumber());
    }

    function testProposeIgnoresTokensReceivedInTheChosenBlock() public {
        // Tokens borrowed or bought in the chosen block don't count, as strategies read the block before it
        address borrower = address(0xbeef);
        compToken.mint(borrower, proposalThreshold);
        vm.prank(borrower);
        compToken.delegate(borrower);

        vm.expectRevert(FailedToPassProposalValidation.selector);
        _createProposal(
            borrower,
            proposalMetadataURI,
            executionStrategy,
            abi.encode(uint32(vm.getBlockNumber()), userPropositionPowerStrategies)
        );
    }

    function testProposeBlockNumberAboveUint32() public {
        // A block number that would wrap into the window once truncated to uint32 is rejected when decoding
        uint256 wrappingBlockNumber = uint256(type(uint32).max) + 1 + vm.getBlockNumber();
        vm.expectRevert();
        _createProposal(
            author,
            proposalMetadataURI,
            executionStrategy,
            abi.encode(wrappingBlockNumber, userPropositionPowerStrategies)
        );
    }

    function testProposeLegacyUserParams() public {
        // Clients still sending only the strategies are rejected, at a realistic block height
        vm.roll(1_000_000);
        vm.expectRevert();
        _createProposal(author, proposalMetadataURI, executionStrategy, abi.encode(userPropositionPowerStrategies));
    }

    function testValidateCalledDirectlyDoesNotUseAuthorQuota() public {
        cooldown = 1 days;
        _setCompStrategy();
        (address validation, bytes memory params) = space.proposalValidationStrategy();
        bytes memory userParams = abi.encode(uint32(vm.getBlockNumber()), userPropositionPowerStrategies);

        // Anyone can call the strategy, but the limit is counted per caller, not for the space
        assertTrue(IProposalValidationStrategy(validation).validate(author, params, userParams));
        assertFalse(IProposalValidationStrategy(validation).validate(author, params, userParams));
        _propose(vm.getBlockNumber());
    }
}

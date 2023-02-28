// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/authenticators/VanillaAuthenticator.sol";
import "../src/voting-strategies/VanillaVotingStrategy.sol";
import "../src/execution-strategies/VanillaExecutionStrategy.sol";
import "../src/SpaceFactory.sol";
import "../src/interfaces/space-factory/ISpaceFactoryEvents.sol";
import "../src/interfaces/space-factory/ISpaceFactoryErrors.sol";

contract SpaceFactoryTest is Test, ISpaceFactoryEvents, ISpaceFactoryErrors {
    SpaceFactory public factory;

    VanillaVotingStrategy vanillaVotingStrategy;
    VanillaAuthenticator vanillaAuthenticator;
    VanillaExecutionStrategy vanillaExecutionStrategy;

    Strategy[] votingStrategies;
    address[] authenticators;
    Strategy[] executionStrategies;

    address public controller;
    uint32 public votingDelay;
    uint32 public minVotingDuration;
    uint32 public maxVotingDuration;
    uint256 public proposalThreshold;
    uint32 public quorum;

    bytes[] votingStrategyMetadata;

    string metadataUri = "SX-EVM";

    function setUp() public {
        factory = new SpaceFactory();

        vanillaVotingStrategy = new VanillaVotingStrategy();
        vanillaAuthenticator = new VanillaAuthenticator();
        vanillaExecutionStrategy = new VanillaExecutionStrategy();

        controller = address(1);
        votingDelay = 0;
        minVotingDuration = 0;
        maxVotingDuration = 1000;
        proposalThreshold = 1;
        quorum = 1;
        votingStrategies.push(Strategy(address(vanillaVotingStrategy), new bytes(0)));
        authenticators.push(address(vanillaAuthenticator));
        executionStrategies.push(Strategy(address(vanillaExecutionStrategy), new bytes(0)));
    }

    function testCreateSpace() public {
        bytes32 salt = bytes32(keccak256(abi.encodePacked("random salt")));
        // Pre-computed address of the space (possible because of CREATE2 deployment)
        address space = _getSpaceAddress(
            controller,
            votingDelay,
            minVotingDuration,
            maxVotingDuration,
            proposalThreshold,
            votingStrategies,
            votingStrategyMetadata,
            authenticators,
            executionStrategies,
            salt
        );

        vm.expectEmit(true, true, true, true);
        emit SpaceCreated(
            space,
            controller,
            votingDelay,
            minVotingDuration,
            maxVotingDuration,
            proposalThreshold,
            metadataUri,
            votingStrategies,
            votingStrategyMetadata,
            authenticators,
            executionStrategies
        );

        factory.createSpace(
            controller,
            votingDelay,
            minVotingDuration,
            maxVotingDuration,
            proposalThreshold,
            metadataUri,
            votingStrategies,
            votingStrategyMetadata,
            authenticators,
            executionStrategies,
            salt
        );
    }

    function testCreateSpaceReusedSalt() public {
        bytes32 salt = bytes32(keccak256(abi.encodePacked("random salt")));

        factory.createSpace(
            controller,
            votingDelay,
            minVotingDuration,
            maxVotingDuration,
            proposalThreshold,
            metadataUri,
            votingStrategies,
            votingStrategyMetadata,
            authenticators,
            executionStrategies,
            salt
        );

        // Reusing the same salt should revert as the computed space address will be
        // the same as the first deployment.
        vm.expectRevert(abi.encodePacked(SpaceCreationFailed.selector)); // EVM revert
        factory.createSpace(
            controller,
            votingDelay,
            minVotingDuration,
            maxVotingDuration,
            proposalThreshold,
            metadataUri,
            votingStrategies,
            votingStrategyMetadata,
            authenticators,
            executionStrategies,
            salt
        );
    }

    function _getSpaceAddress(
        address _controller,
        uint32 _votingDelay,
        uint32 _minVotingDuration,
        uint32 _maxVotingDuration,
        uint256 _proposalThreshold,
        Strategy[] memory _votingStrategies,
        bytes[] memory _votingStrategyMetadata,
        address[] memory _authenticators,
        Strategy[] memory _executionStrategies,
        bytes32 salt
    ) internal view returns (address) {
        return
            address(
                uint160(
                    uint(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                address(factory),
                                salt,
                                keccak256(
                                    abi.encodePacked(
                                        type(Space).creationCode,
                                        abi.encode(
                                            _controller,
                                            _votingDelay,
                                            _minVotingDuration,
                                            _maxVotingDuration,
                                            _proposalThreshold,
                                            _votingStrategies,
                                            _votingStrategyMetadata,
                                            _authenticators,
                                            _executionStrategies
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            );
    }
}

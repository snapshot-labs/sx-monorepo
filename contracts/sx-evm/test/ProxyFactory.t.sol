// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { VanillaAuthenticator } from "../src/authenticators/VanillaAuthenticator.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { VanillaExecutionStrategy } from "../src/execution-strategies/VanillaExecutionStrategy.sol";
import {
    VotingPowerProposalValidationStrategy
} from "../src/proposal-validation-strategies/VotingPowerProposalValidationStrategy.sol";
import { ProxyFactory } from "../src/ProxyFactory.sol";
import { Space } from "../src/Space.sol";
import { IProxyFactoryEvents } from "../src/interfaces/factory/IProxyFactoryEvents.sol";
import { IProxyFactoryErrors } from "../src/interfaces/factory/IProxyFactoryErrors.sol";
import { Strategy } from "../src/types.sol";

// solhint-disable-next-line max-states-count
contract SpaceFactoryTest is Test, IProxyFactoryEvents, IProxyFactoryErrors {
    Space public masterSpace;
    ProxyFactory public factory;
    VanillaVotingStrategy public vanillaVotingStrategy;
    VanillaAuthenticator public vanillaAuthenticator;
    VanillaExecutionStrategy public vanillaExecutionStrategy;
    VotingPowerProposalValidationStrategy public votingPowerProposalValidationStrategy;
    Strategy[] public votingStrategies;
    address[] public authenticators;
    Strategy[] public executionStrategies;

    address public owner;
    uint32 public votingDelay;
    uint32 public minVotingDuration;
    uint32 public maxVotingDuration;
    Strategy public proposalValidationStrategy;
    uint32 public quorum;
    string public metadataURI = "SX-EVM";
    string[] public votingStrategyMetadataURIs;
    string[] public executionStrategyMetadataURIs;

    function setUp() public {
        masterSpace = new Space();
        factory = new ProxyFactory();
        vanillaVotingStrategy = new VanillaVotingStrategy();
        vanillaAuthenticator = new VanillaAuthenticator();
        vanillaExecutionStrategy = new VanillaExecutionStrategy(quorum);

        owner = address(1);
        votingDelay = 0;
        minVotingDuration = 0;
        maxVotingDuration = 1000;
        uint256 proposalThreshold = 1;
        quorum = 1;
        votingStrategies.push(Strategy(address(vanillaVotingStrategy), new bytes(0)));
        authenticators.push(address(vanillaAuthenticator));
        executionStrategies.push(Strategy(address(vanillaExecutionStrategy), new bytes(0)));

        VotingPowerProposalValidationStrategy validationContract = new VotingPowerProposalValidationStrategy();
        proposalValidationStrategy = Strategy(
            address(validationContract),
            abi.encode(proposalThreshold, votingStrategies)
        );
    }

    function testCreateSpace() public {
        bytes32 salt = bytes32(keccak256(abi.encodePacked("random salt")));
        // Pre-computed address of the space (possible because of CREATE2 deployment)
        address spaceProxy = _predictProxyAddress(address(factory), address(masterSpace), salt);

        vm.expectEmit(true, true, true, true);
        emit ProxyDeployed(address(masterSpace), spaceProxy);
        factory.deployProxy(
            address(masterSpace),
            abi.encodeWithSelector(
                Space.initialize.selector,
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators,
                executionStrategies,
                executionStrategyMetadataURIs
            ),
            salt
        );
    }

    function testCreateSpaceReusedSalt() public {
        bytes32 salt = bytes32(keccak256(abi.encodePacked("random salt")));
        factory.deployProxy(
            address(masterSpace),
            abi.encodeWithSelector(
                Space.initialize.selector,
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators,
                executionStrategies,
                executionStrategyMetadataURIs
            ),
            salt
        );
        // Reusing the same salt should revert as the computed space address will be
        // the same as the first deployment.
        vm.expectRevert(abi.encodePacked(SaltAlreadyUsed.selector));
        factory.deployProxy(
            address(masterSpace),
            abi.encodeWithSelector(
                Space.initialize.selector,
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators,
                executionStrategies,
                executionStrategyMetadataURIs
            ),
            salt
        );
    }

    function testCreateSpaceReInitialize() public {
        bytes32 salt = bytes32(keccak256(abi.encodePacked("random salt")));
        factory.deployProxy(
            address(masterSpace),
            abi.encodeWithSelector(
                Space.initialize.selector,
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators,
                executionStrategies,
                executionStrategyMetadataURIs
            ),
            salt
        );
        address spaceProxy = _predictProxyAddress(address(factory), address(masterSpace), salt);

        // Initializing the space should revert as the space is already initialized
        vm.expectRevert("Initializable: contract is already initialized");
        Space(spaceProxy).initialize(
            owner,
            votingDelay,
            minVotingDuration,
            maxVotingDuration,
            proposalValidationStrategy,
            metadataURI,
            votingStrategies,
            votingStrategyMetadataURIs,
            authenticators
        );
    }

    function testPredictProxyAddress() public {
        bytes32 salt = bytes32(keccak256(abi.encodePacked("random salt")));
        // Checking predictProxyAddress in the factory returns the same address as the helper in this test
        assertEq(
            address(factory.predictProxyAddress(address(masterSpace), salt)),
            _predictProxyAddress(address(factory), address(masterSpace), salt)
        );
    }

    function _predictProxyAddress(
        address _factory,
        address implementation,
        bytes32 salt
    ) internal pure returns (address) {
        return
            address(
                uint160(
                    uint(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                _factory,
                                salt,
                                keccak256(
                                    abi.encodePacked(type(ERC1967Proxy).creationCode, abi.encode(implementation, ""))
                                )
                            )
                        )
                    )
                )
            );
    }
}

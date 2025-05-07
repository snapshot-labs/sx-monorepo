// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { VanillaAuthenticator } from "../src/authenticators/VanillaAuthenticator.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { VanillaExecutionStrategy } from "../src/execution-strategies/VanillaExecutionStrategy.sol";
import {
    VanillaProposalValidationStrategy
} from "../src/proposal-validation-strategies/VanillaProposalValidationStrategy.sol";
import { ProxyFactory } from "../src/ProxyFactory.sol";
import { Space } from "../src/Space.sol";
import { ISpaceEvents } from "../src/interfaces/space/ISpaceEvents.sol";
import { IProxyFactoryEvents } from "../src/interfaces/factory/IProxyFactoryEvents.sol";
import { IProxyFactoryErrors } from "../src/interfaces/factory/IProxyFactoryErrors.sol";
import { Strategy, InitializeCalldata } from "../src/types.sol";

// solhint-disable-next-line max-states-count
contract SpaceFactoryTest is Test, IProxyFactoryEvents, IProxyFactoryErrors, ISpaceEvents {
    Space public masterSpace;
    ProxyFactory public factory;
    VanillaVotingStrategy public vanillaVotingStrategy;
    VanillaAuthenticator public vanillaAuthenticator;
    VanillaExecutionStrategy public vanillaExecutionStrategy;
    VanillaProposalValidationStrategy public vanillaProposalValidationStrategy;
    Strategy[] public votingStrategies;
    address[] public authenticators;
    Strategy[] public executionStrategies;

    address public owner;
    uint32 public votingDelay;
    uint32 public minVotingDuration;
    uint32 public maxVotingDuration;
    Strategy public proposalValidationStrategy;
    uint32 public quorum;
    string public daoURI;
    string public metadataURI = "SX-EVM";
    string[] public votingStrategyMetadataURIs;
    string public proposalValidationStrategyMetadataURI;

    function setUp() public {
        owner = address(1);
        masterSpace = new Space();
        factory = new ProxyFactory();
        vanillaVotingStrategy = new VanillaVotingStrategy();
        vanillaAuthenticator = new VanillaAuthenticator();
        vanillaExecutionStrategy = new VanillaExecutionStrategy(owner, quorum);
        vanillaProposalValidationStrategy = new VanillaProposalValidationStrategy();

        votingDelay = 0;
        minVotingDuration = 0;
        maxVotingDuration = 1000;
        uint256 proposalThreshold = 1;
        quorum = 1;
        votingStrategies.push(Strategy(address(vanillaVotingStrategy), new bytes(0)));
        votingStrategyMetadataURIs.push("VanillaVotingStrategy");
        authenticators.push(address(vanillaAuthenticator));
        executionStrategies.push(Strategy(address(vanillaExecutionStrategy), new bytes(0)));
        proposalValidationStrategy = Strategy(
            address(vanillaProposalValidationStrategy),
            abi.encode(proposalThreshold, votingStrategies)
        );
    }

    function testCreateSpace() public {
        uint256 saltNonce = 0;
        bytes memory initializer = abi.encodeWithSelector(
            Space.initialize.selector,
            InitializeCalldata(
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                proposalValidationStrategyMetadataURI,
                daoURI,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators
            )
        );

        // Pre-computed address of the space (possible because of CREATE2 deployment)
        address spaceProxy = _predictProxyAddress(address(factory), address(this), address(masterSpace), saltNonce);

        vm.expectEmit(true, true, true, true);
        emit ProxyDeployed(address(masterSpace), spaceProxy);

        factory.deployProxy(address(masterSpace), initializer, saltNonce);
    }

    function testCreateSpaceInvalidImplementation() public {
        uint256 saltNonce = 0;
        bytes memory initializer = abi.encodeWithSelector(
            Space.initialize.selector,
            InitializeCalldata(
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                proposalValidationStrategyMetadataURI,
                daoURI,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators
            )
        );

        vm.expectRevert(InvalidImplementation.selector);
        factory.deployProxy(address(0), initializer, saltNonce);

        vm.expectRevert(InvalidImplementation.selector);
        factory.deployProxy(address(0x123), initializer, saltNonce);
    }

    function testCreateSpaceFailedInitialization() public {
        uint256 saltNonce = 0;
        // Empty authenticator array
        bytes memory initializer = abi.encodeWithSelector(
            Space.initialize.selector,
            InitializeCalldata(
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                proposalValidationStrategyMetadataURI,
                daoURI,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                new address[](0)
            )
        );

        vm.expectRevert(FailedInitialization.selector);
        factory.deployProxy(address(masterSpace), initializer, saltNonce);
    }

    function testCreateSpaceReusedSalt() public {
        uint256 saltNonce = 0;
        bytes memory initializer = abi.encodeWithSelector(
            Space.initialize.selector,
            InitializeCalldata(
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                proposalValidationStrategyMetadataURI,
                daoURI,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators
            )
        );

        factory.deployProxy(address(masterSpace), initializer, saltNonce);
        // Reusing the same salt should revert as the computed space address will be
        // the same as the first deployment.
        vm.expectRevert(abi.encodePacked(SaltAlreadyUsed.selector));
        factory.deployProxy(address(masterSpace), initializer, saltNonce);
    }

    function testCreateSpaceReInitialize() public {
        uint256 saltNonce = 0;
        bytes memory initializer = abi.encodeWithSelector(
            Space.initialize.selector,
            InitializeCalldata(
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                proposalValidationStrategyMetadataURI,
                daoURI,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators
            )
        );

        factory.deployProxy(address(masterSpace), initializer, saltNonce);
        address spaceProxy = _predictProxyAddress(address(factory), address(this), address(masterSpace), saltNonce);

        // Initializing the space should revert as the space is already initialized
        vm.expectRevert("Initializable: contract is already initialized");
        Space(spaceProxy).initialize(
            InitializeCalldata(
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                proposalValidationStrategyMetadataURI,
                daoURI,
                metadataURI,
                votingStrategies,
                votingStrategyMetadataURIs,
                authenticators
            )
        );
    }

    function testPredictProxyAddress() public view {
        uint256 saltNonce = 0;
        bytes32 salt = keccak256(abi.encodePacked(address(this), saltNonce));
        // Checking predictProxyAddress in the factory returns the same address as the helper in this test
        assertEq(
            address(factory.predictProxyAddress(address(masterSpace), salt)),
            _predictProxyAddress(address(factory), address(this), address(masterSpace), saltNonce)
        );
    }

    function _predictProxyAddress(
        address _factory,
        address _sender,
        address implementation,
        uint256 saltNonce
    ) internal pure returns (address) {
        return
            address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                _factory,
                                keccak256(abi.encodePacked(_sender, saltNonce)),
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

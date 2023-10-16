// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";

import { ProxyFactory } from "../src/ProxyFactory.sol";
import { Space } from "../src/Space.sol";
import { Strategy, InitializeCalldata } from "../src/types.sol";

import { VanillaExecutionStrategy } from "../src/execution-strategies/VanillaExecutionStrategy.sol";
import { AvatarExecutionStrategy } from "../src/execution-strategies/AvatarExecutionStrategy.sol";
import { TimelockExecutionStrategy } from "../src/execution-strategies/timelocks/TimelockExecutionStrategy.sol";
import {
    OptimisticTimelockExecutionStrategy
} from "../src/execution-strategies/timelocks/OptimisticTimelockExecutionStrategy.sol";
import {
    CompTimelockCompatibleExecutionStrategy
} from "../src/execution-strategies/timelocks/CompTimelockCompatibleExecutionStrategy.sol";
import {
    OptimisticCompTimelockCompatibleExecutionStrategy
} from "../src/execution-strategies/timelocks/OptimisticCompTimelockCompatibleExecutionStrategy.sol";

import { VanillaAuthenticator } from "../src/authenticators/VanillaAuthenticator.sol";
import { EthSigAuthenticator } from "../src/authenticators/EthSigAuthenticator.sol";
import { EthTxAuthenticator } from "../src/authenticators/EthTxAuthenticator.sol";

import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { CompVotingStrategy } from "../src/voting-strategies/CompVotingStrategy.sol";
import { OZVotesVotingStrategy } from "../src/voting-strategies/OZVotesVotingStrategy.sol";
import { WhitelistVotingStrategy } from "../src/voting-strategies/WhitelistVotingStrategy.sol";
import { MerkleWhitelistVotingStrategy } from "../src/voting-strategies/MerkleWhitelistVotingStrategy.sol";

import {
    VanillaProposalValidationStrategy
} from "../src/proposal-validation-strategies/VanillaProposalValidationStrategy.sol";
import {
    PropositionPowerProposalValidationStrategy
} from "../src/proposal-validation-strategies/PropositionPowerProposalValidationStrategy.sol";
import {
    ActiveProposalsLimiterProposalValidationStrategy
} from "../src/proposal-validation-strategies/ActiveProposalsLimiterProposalValidationStrategy.sol";
import {
    PropositionPowerAndActiveProposalsLimiterValidationStrategy
} from "../src/proposal-validation-strategies/PropositionPowerAndActiveProposalsLimiterValidationStrategy.sol";

interface SingletonFactory {
    function deploy(bytes memory _initCode, bytes32 salt) external returns (address payable);
}

/// @notice Script to deploy the Snapshot-X contracts
contract Deployer is Script {
    error SpaceInitializationFailed();

    SingletonFactory internal singletonFactory = SingletonFactory(0xce0042B868300000d44A59004Da54A005ffdcf9f);
    address internal deployer;
    string internal deployments;
    string internal deploymentsPath;

    string internal name = "snapshot-x";
    string internal version = "1.0.0";

    using stdJson for string;

    // Nonce used in the CREATE2 salts computation
    uint256 internal saltNonce = 0;

    function run() public {
        deployer = vm.envAddress("DEPLOYER_ADDRESS");

        string memory network = vm.envString("NETWORK");

        deploymentsPath = string.concat(string.concat("./deployments/", network), ".json");

        vm.startBroadcast(deployer);

        // ------- EXECUTION STRATEGIES -------

        (address avatarExecutionStrategy, ) = noRedeploy(
            deployer,
            abi.encodePacked(
                type(AvatarExecutionStrategy).creationCode,
                abi.encode(address(0x1), address(0x1), new address[](0), 0)
            ),
            saltNonce
        );

        deployments.serialize("AvatarExecutionStrategyImplementation", avatarExecutionStrategy);

        (address timelockExecutionStrategy, ) = noRedeploy(
            deployer,
            abi.encodePacked(type(TimelockExecutionStrategy).creationCode),
            saltNonce
        );

        deployments.serialize("TimelockExecutionStrategyImplementation", timelockExecutionStrategy);

        (address optimisticTimelockExecutionStrategy, ) = noRedeploy(
            deployer,
            abi.encodePacked(type(OptimisticTimelockExecutionStrategy).creationCode),
            saltNonce
        );

        deployments.serialize("OptimisticTimelockExecutionStrategyImplementation", optimisticTimelockExecutionStrategy);

        (address compTimelockCompatibleExecutionStrategy, ) = noRedeploy(
            deployer,
            abi.encodePacked(
                type(CompTimelockCompatibleExecutionStrategy).creationCode,
                abi.encode(address(0x1), address(0x1), new address[](0), 0, 0)
            ),
            saltNonce
        );

        deployments.serialize(
            "CompTimelockCompatibleExecutionStrategyImplementation",
            compTimelockCompatibleExecutionStrategy
        );

        (address optimisticCompTimelockCompatibleExecutionStrategy, ) = noRedeploy(
            deployer,
            abi.encodePacked(
                type(OptimisticCompTimelockCompatibleExecutionStrategy).creationCode,
                abi.encode(address(0x1), address(0x1), new address[](0), 0, 0)
            ),
            saltNonce
        );

        deployments.serialize(
            "OptimisticCompTimelockCompatibleExecutionStrategyImplementation",
            optimisticCompTimelockCompatibleExecutionStrategy
        );

        // ------- AUTHENTICATORS -------

        (address vanillaAuthenticator, ) = noRedeploy(deployer, type(VanillaAuthenticator).creationCode, saltNonce);
        deployments.serialize("VanillaAuthenticator", vanillaAuthenticator);

        (address ethTxAuthenticator, ) = noRedeploy(deployer, type(EthTxAuthenticator).creationCode, saltNonce);
        deployments.serialize("EthTxAuthenticator", ethTxAuthenticator);

        (address ethSigAuthenticator, ) = noRedeploy(
            deployer,
            abi.encodePacked(type(EthSigAuthenticator).creationCode, abi.encode(name, version)),
            saltNonce
        );
        deployments.serialize("EthSigAuthenticator", ethSigAuthenticator);

        // ------- VOTING STRATEGIES -------

        (address vanillaVotingStrategy, ) = noRedeploy(deployer, type(VanillaVotingStrategy).creationCode, saltNonce);
        deployments.serialize("VanillaVotingStrategy", vanillaVotingStrategy);

        (address whitelistVotingStrategy, ) = noRedeploy(
            deployer,
            type(WhitelistVotingStrategy).creationCode,
            saltNonce
        );
        deployments.serialize("WhitelistVotingStrategy", whitelistVotingStrategy);

        (address compVotingStrategy, ) = noRedeploy(deployer, type(CompVotingStrategy).creationCode, saltNonce);
        deployments.serialize("CompVotingStrategy", compVotingStrategy);

        (address ozVotesVotingStrategy, ) = noRedeploy(deployer, type(OZVotesVotingStrategy).creationCode, saltNonce);
        deployments.serialize("OZVotesVotingStrategy", ozVotesVotingStrategy);

        (address merkleWhitelistVotingStrategy, ) = noRedeploy(
            deployer,
            type(MerkleWhitelistVotingStrategy).creationCode,
            saltNonce
        );
        deployments.serialize("MerkleWhitelistVotingStrategy", merkleWhitelistVotingStrategy);

        // ------- PROPOSAL VALIDATION STRATEGIES -------

        (address vanillaProposalValidationStrategy, ) = noRedeploy(
            deployer,
            type(VanillaProposalValidationStrategy).creationCode,
            saltNonce
        );
        deployments.serialize("VanillaProposalValidationStrategy", vanillaProposalValidationStrategy);

        (address propositionPowerProposalValidationStrategy, ) = noRedeploy(
            deployer,
            type(PropositionPowerProposalValidationStrategy).creationCode,
            saltNonce
        );
        deployments.serialize("PropositionPowerProposalValidationStrategy", propositionPowerProposalValidationStrategy);

        (address activeProposalsLimiterProposalValidationStrategy, ) = noRedeploy(
            deployer,
            type(ActiveProposalsLimiterProposalValidationStrategy).creationCode,
            saltNonce
        );

        deployments.serialize(
            "ActiveProposalsLimiterProposalValidationStrategy",
            activeProposalsLimiterProposalValidationStrategy
        );

        (address propositionPowerAndActiveProposalsLimiterValidationStrategy, ) = noRedeploy(
            deployer,
            type(PropositionPowerAndActiveProposalsLimiterValidationStrategy).creationCode,
            saltNonce
        );

        deployments.serialize(
            "PropositionPowerAndActiveProposalsLimiterValidationStrategy",
            propositionPowerAndActiveProposalsLimiterValidationStrategy
        );

        // ------- PROXY FACTORY -------

        (address proxyFactory, ) = noRedeploy(deployer, type(ProxyFactory).creationCode, saltNonce);
        deployments.serialize("ProxyFactory", proxyFactory);

        // ------- SPACE -------

        (address space, ) = noRedeploy(deployer, type(Space).creationCode, saltNonce);

        // If the master space is not initialized, initialize it
        if (Space(space).owner() == address(0x0)) {
            // Initializer for the master space, to render it unusable
            Strategy[] memory dummyStrategyArray = new Strategy[](1);
            dummyStrategyArray[0] = Strategy(address(0x1), new bytes(0));
            string[] memory dummyStringArray = new string[](1);
            dummyStringArray[0] = "";
            address[] memory dummyAddressArray = new address[](1);
            dummyAddressArray[0] = address(0x1);
            Space(space).initialize(
                InitializeCalldata(
                    address(0x1),
                    1,
                    1,
                    1,
                    Strategy(address(0x1), new bytes(0)),
                    "",
                    "",
                    "",
                    dummyStrategyArray,
                    dummyStringArray,
                    dummyAddressArray
                )
            );
        }
        (address addr, ) = Space(space).proposalValidationStrategy();
        if (Space(space).owner() != address(0x1) || addr != address(0x1)) {
            // Initialization of the master space was frontrun
            revert SpaceInitializationFailed();
        }

        deployments = deployments.serialize("SpaceImplementation", space);

        deployments.write(deploymentsPath);

        vm.stopBroadcast();
    }

    // Deploys contract if it doesn't exist, otherwise returns the create2 address
    function noRedeploy(
        address _deployer,
        bytes memory _initCode,
        uint256 _saltNonce
    ) internal returns (address, bool) {
        bytes32 salt = keccak256(abi.encodePacked(_deployer, _saltNonce));
        address addy = computeCreate2Address(salt, keccak256(_initCode), address(singletonFactory));
        if (addy.code.length == 0) {
            address _addy = singletonFactory.deploy(_initCode, salt);
            assert(_addy == addy);
            return (addy, true);
        } else {
            return (addy, false);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";
import { ProxyFactory } from "../src/ProxyFactory.sol";
import { Space } from "../src/Space.sol";
import { VanillaAuthenticator } from "../src/authenticators/VanillaAuthenticator.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { VanillaExecutionStrategy } from "../src/execution-strategies/VanillaExecutionStrategy.sol";
import { Strategy } from "../src/types.sol";

// solhint-disable-next-line max-states-count
contract SpaceSetup is Script {
    Space public space;
    address internal masterSpace = address(0x1234);
    ProxyFactory public spaceFactory = ProxyFactory(0xcae03d02f6840D865ccDD6668f1C2FDCA47F2240);
    address public vanillaVotingStrategy = address(0x395eD61716b48DC904140b515e9F682E33330154);
    address public compVotingStrategy = address(0xbBD17346378F76c1c94032594b57C93c24857B19);
    address public whitelistVotingStrategy = address(0xC89a0C93Af823F794F96F7b2B63Fc2a1f1AE9427);
    address public vanillaAuthenticator = address(0x86bfa0726CBA0FeBEeE457F04b705AB74B54D01c);
    address public ethSigAuthenticator = address(0x328c6F186639f1981Dc25eD4517E8Ed2aDd85569);
    address public ethTxAuthenticator = address(0x37315Ce75920B653f0f13734c709e199876455C9);
    address public vanillaExecutionStrategy = address(0xb1001Fdf62C020761039A750b27e73C512fDaa5E);
    address public votingPowerProposalValidationContract = address(42); // TODO: update
    Strategy public votingPowerProposalValidationStrategy;
    address public owner = address(0x2842c82E20ab600F443646e1BC8550B44a513D82);
    uint32 public votingDelay;
    uint32 public minVotingDuration;
    uint32 public maxVotingDuration;
    uint256 public proposalThreshold;
    uint32 public quorum;
    string internal metadataURI = "SX Test Space";

    function run() public {
        Strategy[] memory votingStrategies = new Strategy[](2);
        bytes[] memory votingStrategyMetadata = new bytes[](2);
        votingStrategies[0] = Strategy(vanillaVotingStrategy, new bytes(0));
        votingStrategyMetadata[0] = new bytes(0);
        address uni = address(0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984); // Goerli UNI token
        votingStrategies[1] = Strategy(compVotingStrategy, abi.encode(uni));
        votingStrategyMetadata[1] = new bytes(18); // UNI token decimals

        address[] memory authenticators = new address[](3);
        authenticators[0] = vanillaAuthenticator;
        authenticators[1] = ethSigAuthenticator;
        authenticators[2] = ethTxAuthenticator;
        Strategy[] memory executionStrategies = new Strategy[](1);
        quorum = 1;
        executionStrategies[0] = Strategy(vanillaExecutionStrategy, new bytes(quorum));
        votingDelay = 0;
        minVotingDuration = 0;
        maxVotingDuration = 1000;
        proposalThreshold = 1;
        votingPowerProposalValidationStrategy = Strategy(
            votingPowerProposalValidationContract,
            abi.encode(proposalThreshold, votingStrategies)
        );
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        spaceFactory.deployProxy(
            masterSpace,
            abi.encodeWithSelector(
                Space.initialize.selector,
                owner,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                votingPowerProposalValidationStrategy,
                metadataURI,
                votingStrategies,
                votingStrategyMetadata,
                authenticators,
                executionStrategies
            ),
            0
        );

        vm.stopBroadcast();
    }
}

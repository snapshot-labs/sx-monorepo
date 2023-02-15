// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/SpaceFactory.sol";
import "../src/authenticators/VanillaAuthenticator.sol";
import "../src/voting-strategies/VanillaVotingStrategy.sol";
import "../src/execution-strategies/VanillaExecutionStrategy.sol";

contract SpaceSetup is Script {
    Space public space;

    SpaceFactory public spaceFactory = SpaceFactory(0xcae03d02f6840D865ccDD6668f1C2FDCA47F2240);

    address public vanillaVotingStrategy = address(0x395eD61716b48DC904140b515e9F682E33330154);
    address public compVotingStrategy = address(0xbBD17346378F76c1c94032594b57C93c24857B19);
    address public whitelistStrategy = address(0xC89a0C93Af823F794F96F7b2B63Fc2a1f1AE9427);

    address public vanillaAuthenticator = address(0x86bfa0726CBA0FeBEeE457F04b705AB74B54D01c);
    address public ethSigAuthenticator = address(0x328c6F186639f1981Dc25eD4517E8Ed2aDd85569);
    address public ethTxAuthenticator = address(0x37315Ce75920B653f0f13734c709e199876455C9);

    address public vanillaExecutionStrategy = address(0xb1001Fdf62C020761039A750b27e73C512fDaa5E);

    address public controller = address(0x2842c82E20ab600F443646e1BC8550B44a513D82);

    uint32 public votingDelay;
    uint32 public minVotingDuration;
    uint32 public maxVotingDuration;
    uint256 public proposalThreshold;
    uint32 public quorum;

    //string public spaceMetadataUri = "SOC Test Space";

    Strategy[2] public votingStrategies;

    function run() public {
        Strategy[] memory votingStrategies = new Strategy[](2);
        votingStrategies[0] = Strategy(vanillaVotingStrategy, new bytes(0));
        address uni = address(0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984); // Goerli UNI token
        votingStrategies[1] = Strategy(compVotingStrategy, abi.encode(uni));

        address[] memory authenticators = new address[](3);
        authenticators[0] = vanillaAuthenticator;
        authenticators[1] = ethSigAuthenticator;
        authenticators[2] = ethTxAuthenticator;

        address[] memory executionStrategies = new address[](1);
        executionStrategies[0] = vanillaExecutionStrategy;

        votingDelay = 0;
        minVotingDuration = 0;
        maxVotingDuration = 1000;
        proposalThreshold = 1;
        quorum = 1;

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        spaceFactory.createSpace(
            controller,
            votingDelay,
            minVotingDuration,
            maxVotingDuration,
            proposalThreshold,
            quorum,
            votingStrategies,
            authenticators,
            executionStrategies,
            keccak256(abi.encodePacked("SOC Test Space: 2"))
        );

        vm.stopBroadcast();
    }
}

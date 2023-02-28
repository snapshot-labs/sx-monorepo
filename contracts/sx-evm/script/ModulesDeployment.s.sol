// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "forge-std/Script.sol";

import "../src/Space.sol";
import "../src/authenticators/VanillaAuthenticator.sol";
import "../src/voting-strategies/VanillaVotingStrategy.sol";
import "../src/execution-strategies/VanillaExecutionStrategy.sol";

import "../src/authenticators/EthSigAuthenticator.sol";
import "../src/authenticators/EthTxAuthenticator.sol";

import "../src/voting-strategies/CompVotingStrategy.sol";
import "../src/voting-strategies/WhitelistStrategy.sol";

import "../src/SpaceFactory.sol";

contract ModulesDeployment is Script {
    VanillaVotingStrategy public vanillaVotingStrategy;
    CompVotingStrategy public compVotingStrategy;
    WhitelistStrategy public whitelistStrategy;

    VanillaAuthenticator public vanillaAuthenticator;
    EthSigAuthenticator public ethSigAuthenticator;
    EthTxAuthenticator public ethTxAuthenticator;

    VanillaExecutionStrategy public vanillaExecutionStrategy;

    SpaceFactory public spaceFactory;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        vanillaVotingStrategy = new VanillaVotingStrategy();
        compVotingStrategy = new CompVotingStrategy();
        whitelistStrategy = new WhitelistStrategy();

        vanillaAuthenticator = new VanillaAuthenticator();
        ethSigAuthenticator = new EthSigAuthenticator("snapshot-x", "0.1.0");
        ethTxAuthenticator = new EthTxAuthenticator();

        vanillaExecutionStrategy = new VanillaExecutionStrategy();

        spaceFactory = new SpaceFactory();

        vm.stopBroadcast();
    }
}

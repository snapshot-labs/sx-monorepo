// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";
import { Space } from "../src/Space.sol";
import { VanillaAuthenticator } from "../src/authenticators/VanillaAuthenticator.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { VanillaExecutionStrategy } from "../src/execution-strategies/VanillaExecutionStrategy.sol";
import {
    VotingPowerProposalValidationStrategy
} from "../src/proposal-validation-strategies/VotingPowerProposalValidationStrategy.sol";
import { EthSigAuthenticator } from "../src/authenticators/EthSigAuthenticator.sol";
import { EthTxAuthenticator } from "../src/authenticators/EthTxAuthenticator.sol";
import { CompVotingStrategy } from "../src/voting-strategies/CompVotingStrategy.sol";
import { WhitelistStrategy } from "../src/voting-strategies/WhitelistStrategy.sol";
import { ProxyFactory } from "../src/ProxyFactory.sol";

contract ModulesDeployment is Script {
    VanillaVotingStrategy public vanillaVotingStrategy;
    CompVotingStrategy public compVotingStrategy;
    WhitelistStrategy public whitelistStrategy;
    VanillaAuthenticator public vanillaAuthenticator;
    VotingPowerProposalValidationStrategy public votingPowerProposalValidationStrategy;
    EthSigAuthenticator public ethSigAuthenticator;
    EthTxAuthenticator public ethTxAuthenticator;
    VanillaExecutionStrategy public vanillaExecutionStrategy;
    ProxyFactory public spaceFactory;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        vanillaVotingStrategy = new VanillaVotingStrategy();
        compVotingStrategy = new CompVotingStrategy();
        whitelistStrategy = new WhitelistStrategy();
        vanillaAuthenticator = new VanillaAuthenticator();
        ethSigAuthenticator = new EthSigAuthenticator("snapshot-x", "0.1.0");
        ethTxAuthenticator = new EthTxAuthenticator();
        // TODO: set quorum prior to this deploy (or remove)
        vanillaExecutionStrategy = new VanillaExecutionStrategy(1);
        votingPowerProposalValidationStrategy = new VotingPowerProposalValidationStrategy();
        spaceFactory = new ProxyFactory();
        vm.stopBroadcast();
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";

import { ProxyFactory } from "../src/ProxyFactory.sol";
import { Space } from "../src/Space.sol";
import { VanillaAuthenticator } from "../src/authenticators/VanillaAuthenticator.sol";
import { TimelockExecutionStrategy } from "../src/execution-strategies/timelocks/TimelockExecutionStrategy.sol";
import { Strategy, IndexedStrategy, InitializeCalldata, Choice, MetaTransaction } from "../src/types.sol";
import { Enum } from "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

// Example script to deploy a space, create a proposal, vote on it, and execute it.
contract Example is Script {
    // Paste in the addresses from your json in the /deployments/ folder. The below are from v1.0.2 on goerli.
    address public proxyFactory = address(0x4B4F7f64Be813Ccc66AEFC3bFCe2baA01188631c);
    address public spaceImplementation = address(0xd9c46d5420434355d0E5Ca3e3cCb20cE7A533964);
    address public vanillaVotingStrategy = address(0xC1245C5DCa7885C73E32294140F1e5d30688c202);
    address public vanillaProposalValidationStrategy = address(0x9A39194F870c410633C170889E9025fba2113c79);
    address public vanillaAuthenticator = address(0xb9BE0a0093933968E3B4c4fC5d939B6c1Fe45142);
    address public timelockExecutionStrategyImplementation = address(0xdD5243b799759e2C64bD6CaFD7e57FcbB676f87D);

    // Change the salt to deploy multiple spaces or get a 'salt already used' error
    uint256 public constant saltNonce = 1234;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = address(0x2842c82E20ab600F443646e1BC8550B44a513D82);

        Strategy[] memory votingStrategies = new Strategy[](1);
        votingStrategies[0] = Strategy(vanillaVotingStrategy, new bytes(0));

        string[] memory votingStrategyMetadataURIs = new string[](1);
        votingStrategyMetadataURIs[0] = "";

        address[] memory authenticators = new address[](1);
        authenticators[0] = vanillaAuthenticator;

        string memory proposalValidationStrategyMetadataURI = "";
        string memory daoURI = "";
        string memory metadataURI = "";

        // Deploy space
        ProxyFactory(proxyFactory).deployProxy(
            spaceImplementation,
            abi.encodeWithSelector(
                Space.initialize.selector,
                InitializeCalldata(
                    deployer,
                    0,
                    0,
                    100,
                    Strategy(vanillaProposalValidationStrategy, new bytes(0)),
                    proposalValidationStrategyMetadataURI,
                    daoURI,
                    metadataURI,
                    votingStrategies,
                    votingStrategyMetadataURIs,
                    authenticators
                )
            ),
            saltNonce
        );

        address space = ProxyFactory(proxyFactory).predictProxyAddress(
            spaceImplementation,
            keccak256(abi.encodePacked(deployer, saltNonce))
        );

        // Deploy Execution Strategy with the space whitelisted
        address[] memory spacesWhitelist = new address[](1);
        spacesWhitelist[0] = space;
        ProxyFactory(proxyFactory).deployProxy(
            timelockExecutionStrategyImplementation,
            abi.encodeWithSelector(
                TimelockExecutionStrategy.setUp.selector,
                abi.encode(deployer, deployer, spacesWhitelist, 0, 0)
            ),
            saltNonce
        );

        address timelockExecutionStrategy = ProxyFactory(proxyFactory).predictProxyAddress(
            timelockExecutionStrategyImplementation,
            keccak256(abi.encodePacked(deployer, saltNonce))
        );

        // Create proposal
        MetaTransaction[] memory proposalTransactions = new MetaTransaction[](1);
        // Example proposal tx
        proposalTransactions[0] = MetaTransaction(deployer, 0, abi.encode("hello"), Enum.Operation.Call, 0);
        VanillaAuthenticator(vanillaAuthenticator).authenticate(
            space,
            Space.propose.selector,
            abi.encode(
                deployer,
                "",
                Strategy(timelockExecutionStrategy, abi.encode(proposalTransactions)),
                new bytes(0)
            )
        );

        // Cast vote
        IndexedStrategy[] memory userVotingStrategies = new IndexedStrategy[](1);
        userVotingStrategies[0] = IndexedStrategy(0, new bytes(0));
        VanillaAuthenticator(vanillaAuthenticator).authenticate(
            space,
            Space.vote.selector,
            abi.encode(deployer, 1, Choice.For, userVotingStrategies, "")
        );

        // Execute proposal, which queues it in the tx in timelock
        Space(space).execute(1, abi.encode(proposalTransactions));

        vm.stopBroadcast();
    }
}

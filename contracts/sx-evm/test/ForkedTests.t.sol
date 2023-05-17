// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { CompVotingStrategy } from "../src/voting-strategies/CompVotingStrategy.sol";
import { CompToken } from "./mocks/CompToken.sol";
import { SpaceTest } from "./utils/Space.t.sol";
import { SigUtils } from "./utils/SigUtils.sol";
import { EthSigAuthenticator } from "../src/authenticators/EthSigAuthenticator.sol";
import { EthTxAuthenticator } from "../src/authenticators/EthTxAuthenticator.sol";
import {
    PropositionPowerAndActiveProposalsLimiterValidationStrategy
} from "../src/proposal-validation-strategies/PropositionPowerAndActiveProposalsLimiterValidationStrategy.sol";
import { Choice, IndexedStrategy, Strategy, UpdateSettingsInput } from "../src/types.sol";

// Similar to "GasSnapshots.t.sol" except this uses a forked network
// solhint-disable-next-line max-states-count
contract ForkedTest is SpaceTest, SigUtils {
    uint256 internal goerliFork;

    CompVotingStrategy internal compVotingStrategy;
    CompToken internal compToken;

    uint256 internal constant TOKEN_AMOUNT = 10000;

    string internal constant NAME = "snapshot-x";
    string internal constant VERSION = "1";

    EthSigAuthenticator internal ethSigAuth;
    EthTxAuthenticator internal ethTxAuth;
    PropositionPowerAndActiveProposalsLimiterValidationStrategy internal validationStrategy;

    uint256 internal key2;
    uint256 internal key3;
    uint256 internal key4;
    uint256 internal key5;
    uint256 internal key6;
    address internal voter2;
    address internal voter3;
    address internal voter4;
    address internal voter5;
    address internal voter6;

    // solhint-disable-next-line no-empty-blocks
    constructor() SigUtils(NAME, VERSION) {}

    function setUp() public virtual override {
        super.setUp();

        string memory GOERLI_RPC_URL = vm.envString("GOERLI_RPC_URL");
        goerliFork = vm.createFork(GOERLI_RPC_URL);

        (voter2, key2) = makeAddrAndKey("Voter 2 Key");
        (voter3, key3) = makeAddrAndKey("Voter 3 Key");
        (voter4, key4) = makeAddrAndKey("Voter 4 Key");
        (voter5, key5) = makeAddrAndKey("Voter 5 Key");
        (voter6, key6) = makeAddrAndKey("Voter 6 Key");

        Strategy[] memory newVotingStrategies = new Strategy[](1);
        compVotingStrategy = new CompVotingStrategy();
        compToken = new CompToken();
        newVotingStrategies[0] = Strategy(address(compVotingStrategy), abi.encodePacked(address(compToken)));
        string[] memory newVotingStrategyMetadataURIs = new string[](0);
        uint8[] memory toRemove = new uint8[](1);
        toRemove[0] = 0;

        // Update contract's voting strategies.
        space.updateSettings(
            UpdateSettingsInput(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                newVotingStrategies,
                newVotingStrategyMetadataURIs,
                toRemove
            )
        );

        // Mint tokens for the users
        compToken.mint(author, TOKEN_AMOUNT);
        compToken.mint(voter, TOKEN_AMOUNT);
        compToken.mint(voter2, TOKEN_AMOUNT);
        compToken.mint(voter3, TOKEN_AMOUNT);
        compToken.mint(voter4, TOKEN_AMOUNT);
        compToken.mint(voter5, TOKEN_AMOUNT);
        compToken.mint(voter6, TOKEN_AMOUNT);
        // Delegate to self to activate checkpoints
        vm.prank(author);
        compToken.delegate(author);
        vm.prank(voter);
        compToken.delegate(voter);
        vm.prank(voter2);
        compToken.delegate(voter2);
        vm.prank(voter3);
        compToken.delegate(voter3);
        vm.prank(voter4);
        compToken.delegate(voter4);
        vm.prank(voter5);
        compToken.delegate(voter5);
        vm.prank(voter6);
        compToken.delegate(voter6);

        // Adding the eth sig authenticator to the space
        ethSigAuth = new EthSigAuthenticator(NAME, VERSION);
        vm.makePersistent(address(ethSigAuth));
        ethTxAuth = new EthTxAuthenticator();
        vm.makePersistent(address(ethTxAuth));
        address[] memory newAuths = new address[](2);
        newAuths[0] = address(ethSigAuth);
        newAuths[1] = address(ethTxAuth);
        space.updateSettings(
            UpdateSettingsInput(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                newAuths,
                authenticators,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        // Replace with comp voting strategy which should be at index 1.
        userVotingStrategies[0] = IndexedStrategy(1, newVotingStrategies[0].params);

        Strategy[] memory currentVotingStrategies = new Strategy[](2);
        (address addr0, bytes memory params0) = space.votingStrategies(0);
        currentVotingStrategies[0] = Strategy(addr0, params0);
        (address addr1, bytes memory params1) = space.votingStrategies(1);
        currentVotingStrategies[1] = Strategy(addr1, params1);

        // Set the proposal validation strategy to Comp token proposition power.
        validationStrategy = new PropositionPowerAndActiveProposalsLimiterValidationStrategy();
        // Using the current active strategies in the space as the allowed strategies for proposal.
        space.updateSettings(
            UpdateSettingsInput(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                Strategy(address(validationStrategy), abi.encode(TOKEN_AMOUNT, currentVotingStrategies)),
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
    }

    function testFork_VoteAndProposeWithCompToken() public {
        vm.selectFork(goerliFork);

        vm.roll(block.number + 1);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            AUTHOR_KEY,
            _getProposeDigest(
                address(ethSigAuth),
                address(space),
                address(author),
                proposalMetadataURI,
                executionStrategy,
                abi.encode(userVotingStrategies),
                0
            )
        );

        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, abi.encode(userVotingStrategies))
        );

        (v, r, s) = vm.sign(
            AUTHOR_KEY,
            _getProposeDigest(
                address(ethSigAuth),
                address(space),
                address(author),
                proposalMetadataURI,
                executionStrategy,
                abi.encode(userVotingStrategies),
                1
            )
        );

        ethSigAuth.authenticate(
            v,
            r,
            s,
            1,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, abi.encode(userVotingStrategies))
        );

        uint256 proposalId = 1;

        (v, r, s) = vm.sign(
            VOTER_KEY,
            _getVoteDigest(address(ethSigAuth), address(space), voter, proposalId, Choice.For, userVotingStrategies, "")
        );
        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, "")
        );

        (v, r, s) = vm.sign(
            key2,
            _getVoteDigest(
                address(ethSigAuth),
                address(space),
                voter2,
                proposalId,
                Choice.For,
                userVotingStrategies,
                ""
            )
        );

        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter2, proposalId, Choice.For, userVotingStrategies, "")
        );

        (v, r, s) = vm.sign(
            key3,
            _getVoteDigest(
                address(ethSigAuth),
                address(space),
                voter3,
                proposalId,
                Choice.For,
                userVotingStrategies,
                "bafkreibv2yjocyotgj2n6awe5z7vqxrzyo72t2ml2ijgj4fgktfpyukuv4"
            )
        );

        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            VOTE_SELECTOR,
            abi.encode(
                voter3,
                proposalId,
                Choice.For,
                userVotingStrategies,
                "bafkreibv2yjocyotgj2n6awe5z7vqxrzyo72t2ml2ijgj4fgktfpyukuv4"
            )
        );

        vm.prank(voter4);
        ethTxAuth.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter4, proposalId, Choice.For, userVotingStrategies, "")
        );

        vm.prank(voter5);
        ethTxAuth.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter5, proposalId, Choice.For, userVotingStrategies, "")
        );

        vm.prank(voter6);
        ethTxAuth.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(
                voter6,
                proposalId,
                Choice.For,
                userVotingStrategies,
                "bafkreibv2yjocyotgj2n6awe5z7vqxrzyo72t2ml2ijgj4fgktfpyukuv4"
            )
        );
    }
}

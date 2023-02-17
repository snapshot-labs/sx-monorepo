// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "../src/voting-strategies/CompVotingStrategy.sol";
import "./mocks/CompToken.sol";
import "./utils/Space.t.sol";
import "./utils/SigUtils.sol";
import "../src/authenticators/EthSigAuthenticator.sol";
import "forge-std/console2.sol";

contract GasSnapshotsTest is SpaceTest, SigUtils {
    CompVotingStrategy public compVotingStrategy;
    CompToken public compToken;

    EthSigAuthenticator public ethSigAuth;

    string private constant name = "snapshot-x";
    string private constant version = "1";

    address public user = address(this);

    constructor() SigUtils(name, version) {}

    function setUp() public virtual override {
        super.setUp();

        Strategy[] memory newStrategies = new Strategy[](1);
        compVotingStrategy = new CompVotingStrategy();
        compToken = new CompToken();
        newStrategies[0] = Strategy(address(compVotingStrategy), abi.encodePacked(address(compToken)));

        // Update contract's voting strategies.
        space.addVotingStrategies(newStrategies);

        // Mint tokens for the user
        compToken.mint(user, 10000);
        // Must delegate to self to activate checkpoints
        compToken.delegate(user);

        // Adding the eth sig authenticator to the space
        ethSigAuth = new EthSigAuthenticator(name, version);
        address[] memory newAuths = new address[](1);
        newAuths[0] = address(ethSigAuth);
        space.addAuthenticators(newAuths);

        // Remove old one to make sure state is clean.
        space.removeAuthenticators(authenticators);

        // Delete strategy [0] because it's the vanilla one.
        delete userVotingStrategies[0];
        // Add the new comp voting strategy which should be at index 1.
        userVotingStrategies.push(IndexedStrategy(1, new bytes(0)));
    }

    function testSnapshots() public {
        // Propose
        {
            // Advance one block or the block will be considered invalid.
            vm.roll(block.number + 1);

            uint256 salt = 0;
            bytes32 digest = _getProposeDigest(
                address(ethSigAuth),
                address(space),
                address(author),
                proposalMetadataUri,
                executionStrategy,
                userVotingStrategies,
                salt
            );
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(authorKey, digest);

            snapStart("ProposeSigComp");
            ethSigAuth.authenticate(
                v,
                r,
                s,
                salt,
                address(space),
                PROPOSE_SELECTOR,
                abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
            );
            snapEnd();
        }

        // Vote
        {
            uint256 proposalId = 1;
            uint256 salt = 1;
            bytes32 digest = _getVoteDigest(
                address(ethSigAuth),
                address(space),
                voter,
                proposalId,
                Choice.For,
                userVotingStrategies,
                salt
            );
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(voterKey, digest);

            snapStart("VoteSigComp");
            ethSigAuth.authenticate(
                v,
                r,
                s,
                salt,
                address(space),
                VOTE_SELECTOR,
                abi.encode(voter, proposalId, Choice.For, userVotingStrategies)
            );
            snapEnd();
        }
    }
}

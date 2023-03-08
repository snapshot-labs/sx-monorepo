// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";
import { Space } from "../src/Space.sol";
import { VanillaAuthenticator } from "../src/authenticators/VanillaAuthenticator.sol";
import { VanillaVotingStrategy } from "../src/voting-strategies/VanillaVotingStrategy.sol";
import { VanillaExecutionStrategy } from "../src/execution-strategies/VanillaExecutionStrategy.sol";
import { Choice, IndexedStrategy, Strategy } from "../src/types.sol";

contract PopulateVanillaSpace is Script {
    bytes4 internal constant PROPOSE_SELECTOR =
        bytes4(keccak256("propose(address,string,(address,bytes),(uint8,bytes)[])"));
    bytes4 internal constant VOTE_SELECTOR = bytes4(keccak256("vote(address,uint256,uint8,(uint8,bytes)[],string)"));

    Space internal space;
    VanillaVotingStrategy internal vanillaVotingStrategy;
    VanillaAuthenticator internal vanillaAuthenticator;
    VanillaExecutionStrategy internal vanillaExecutionStrategy;

    string public proposalMetadataURI = "SOC Test Proposal";
    Strategy public executionStrategy;
    IndexedStrategy[] public userVotingStrategies;

    string internal voteMetadataURI = "";

    function run() public {
        space = Space(0x95DC6f73301356c9909921e21b735601C42fc1a8);
        vanillaAuthenticator = VanillaAuthenticator(0xc4fb316710643f7FfBB566e5586862076198DAdB);
        vanillaExecutionStrategy = VanillaExecutionStrategy(0x81519C29621Ba131ea398c15B17391F53e8B9A94);

        executionStrategy = Strategy(address(vanillaExecutionStrategy), new bytes(0));
        userVotingStrategies.push(IndexedStrategy(0, new bytes(0)));

        uint256 proposalId = _createProposal(
            address(this),
            proposalMetadataURI,
            executionStrategy,
            userVotingStrategies
        );

        _vote(address(this), proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function _createProposal(
        address _author,
        string memory _metadataURI,
        Strategy memory _executionStrategy,
        IndexedStrategy[] memory _userVotingStrategies
    ) internal returns (uint256) {
        vanillaAuthenticator.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(_author, _metadataURI, _executionStrategy, _userVotingStrategies)
        );

        return space.nextProposalId() - 1;
    }

    function _vote(
        address _author,
        uint256 _proposalId,
        Choice _choice,
        IndexedStrategy[] memory _userVotingStrategies,
        string memory _voteMetadataURI
    ) internal {
        vanillaAuthenticator.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(_author, _proposalId, _choice, _userVotingStrategies, _voteMetadataURI)
        );
    }
}

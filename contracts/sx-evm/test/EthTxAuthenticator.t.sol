// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { AuthenticatorTest } from "./utils/Authenticator.t.sol";
import { EthTxAuthenticator } from "../src/authenticators/EthTxAuthenticator.sol";
import { Choice, IndexedStrategy } from "../src/types.sol";

contract EthTxAuthenticatorTest is SpaceTest {
    error InvalidFunctionSelector();
    error InvalidMessageSender();

    EthTxAuthenticator internal ethTxAuth;
    string internal newMetadataURI = "Test42";
    IndexedStrategy internal newStrategy = IndexedStrategy(0, new bytes(0));

    function setUp() public virtual override {
        super.setUp();

        // Adding the eth tx authenticator to the space
        ethTxAuth = new EthTxAuthenticator();
        address[] memory newAuths = new address[](1);
        newAuths[0] = address(ethTxAuth);
        space.addAuthenticators(newAuths);
    }

    function testAuthenticateTxPropose() public {
        vm.prank(address(author));
        ethTxAuth.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies, voteMetadataURI)
        );
    }

    function testAuthenticateTxProposeInvalidAuthor() public {
        vm.expectRevert(InvalidMessageSender.selector);
        vm.prank(address(123));
        ethTxAuth.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies, voteMetadataURI)
        );
    }

    function testAuthenticateTxProposeInvalidSelector() public {
        vm.expectRevert(InvalidFunctionSelector.selector);
        vm.prank(author);
        ethTxAuth.authenticate(
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies, voteMetadataURI)
        );
    }

    function testAuthenticateTxVote() public {
        // Creating demo proposal using vanilla authenticator (both vanilla and eth tx authenticators are whitelisted)
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.prank(voter);
        ethTxAuth.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );
    }

    function testAuthenticateTxVoteInvalidVoter() public {
        uint256 proposalId = 1;

        vm.expectRevert(InvalidMessageSender.selector);
        vm.prank(address(123));
        ethTxAuth.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );
    }

    function testAuthenticateTxVoteInvalidSelector() public {
        uint256 proposalId = 1;

        vm.expectRevert(InvalidFunctionSelector.selector);
        vm.prank(voter);
        ethTxAuth.authenticate(
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );
    }

    function testAuthenticateTxUpdateProposal() public {
        uint32 votingDelay = 10;
        space.setVotingDelay(votingDelay);
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ProposalUpdated(proposalId, newStrategy, newMetadataURI);
        ethTxAuth.authenticate(
            address(space),
            UPDATE_PROPOSAL_SELECTOR,
            abi.encode(author, proposalId, newStrategy, newMetadataURI)
        );

        // Fast forward and ensure everything is still working correctly
        vm.warp(block.timestamp + votingDelay);
        vm.prank(voter);
        ethTxAuth.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );

        space.execute(proposalId, executionStrategy.params);
    }

    function testAuthenticateTxUpdateProposalInvalidCaller() public {
        uint256 proposalId = 1;

        vm.expectRevert(InvalidMessageSender.selector);
        vm.prank(address(123));
        ethTxAuth.authenticate(
            address(space),
            UPDATE_PROPOSAL_SELECTOR,
            abi.encode(author, proposalId, newStrategy, newMetadataURI)
        );
    }

    function testAuthenticateTxUpdateProposalInvalidSelector() public {
        uint256 proposalId = 1;

        vm.expectRevert(InvalidFunctionSelector.selector);
        ethTxAuth.authenticate(address(space), bytes4(0xdeadbeef), abi.encode(author, proposalId, newMetadataURI));
    }
}

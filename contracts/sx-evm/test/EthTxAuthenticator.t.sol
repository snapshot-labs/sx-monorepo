// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./utils/Space.t.sol";
import "./utils/Authenticator.t.sol";
import "../src/authenticators/EthTxAuthenticator.sol";

contract EthTxAuthenticatorTest is SpaceTest {
    EthTxAuthenticator ethTxAuth;

    error InvalidFunctionSelector();
    error InvalidMessageSender();

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
        snapStart("ProposeWithTx");
        ethTxAuth.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );
        snapEnd();
    }

    function testAuthenticateTxProposeInvalidAuthor() public {
        vm.expectRevert(InvalidMessageSender.selector);
        vm.prank(address(123));
        ethTxAuth.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateTxProposeInvalidSelector() public {
        vm.expectRevert(InvalidFunctionSelector.selector);
        vm.prank(author);
        ethTxAuth.authenticate(
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateTxVote() public {
        // Creating demo proposal using vanilla authenticator (both vanilla and eth tx authenticators are whitelisted)
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.prank(voter);
        snapStart("VoteWithTx");
        ethTxAuth.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies)
        );
        snapEnd();
    }

    function testAuthenticateTxVoteInvalidVoter() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(InvalidMessageSender.selector);
        vm.prank(address(123));
        ethTxAuth.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies)
        );
    }

    function testAuthenticateTxVoteInvalidSelector() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(InvalidFunctionSelector.selector);
        vm.prank(voter);
        ethTxAuth.authenticate(
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies)
        );
    }
}

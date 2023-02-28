// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./utils/Space.t.sol";
import "./utils/Authenticator.t.sol";
import "./utils/SigUtils.sol";
import "../src/authenticators/EthSigAuthenticator.sol";

contract EthSigAuthenticatorTest is SpaceTest, SigUtils {
    error InvalidSignature();
    error InvalidFunctionSelector();
    error SaltAlreadyUsed();

    string private constant name = "snapshot-x";
    string private constant version = "1";
    string newMetadataUri = "Test456";
    IndexedStrategy newStrategy = IndexedStrategy(0, new bytes(0));

    EthSigAuthenticator public ethSigAuth;

    constructor() SigUtils(name, version) {}

    function setUp() public virtual override {
        super.setUp();

        // Adding the eth sig authenticator to the space
        ethSigAuth = new EthSigAuthenticator(name, version);
        address[] memory newAuths = new address[](1);
        newAuths[0] = address(ethSigAuth);
        space.addAuthenticators(newAuths);
    }

    function testAuthenticatePropose() public {
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

        snapStart("ProposeWithSig");
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

    function testAuthenticateProposeInvalidSigner() public {
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

        // Sign with a key that does not correspond to the proposal author's address
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(unauthorizedKey, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateInvalidSignature() public {
        uint256 salt = 0;
        // signing with a incorrect message
        bytes32 digest = _getProposeDigest(
            address(ethSigAuth),
            address(space),
            address(author),
            "invalid metadata uri",
            executionStrategy,
            userVotingStrategies,
            salt
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(authorKey, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateProposeReusedSignature() public {
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
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );

        vm.expectRevert(SaltAlreadyUsed.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateProposeInvalidSelector() public {
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

        vm.expectRevert(InvalidFunctionSelector.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateVote() public {
        // Creating demo proposal using vanilla authenticator (both vanilla and eth sig authenticators are whitelisted)
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        bytes32 digest = _getVoteDigest(
            address(ethSigAuth),
            address(space),
            voter,
            proposalId,
            Choice.For,
            userVotingStrategies,
            voteMetadataUri
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(voterKey, digest);

        snapStart("VoteWithSig");
        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataUri)
        );
        snapEnd();
    }

    function testAuthenticateVoteInvalidSigner() public {
        uint256 proposalId = 1;

        uint256 salt = 0;
        bytes32 digest = _getVoteDigest(
            address(ethSigAuth),
            address(space),
            voter,
            proposalId,
            Choice.For,
            userVotingStrategies,
            voteMetadataUri
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(unauthorizedKey, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataUri)
        );
    }

    function testAuthenticateVoteInvalidSignature() public {
        uint256 proposalId = 1;

        uint256 salt = 0;
        // Signing with an incorrect vote choice
        bytes32 digest = _getVoteDigest(
            address(ethSigAuth),
            address(space),
            voter,
            proposalId,
            Choice.Against,
            userVotingStrategies,
            voteMetadataUri
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(voterKey, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataUri)
        );
    }

    function testAuthenticateVoteReusedSignature() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        uint256 salt = 0;
        bytes32 digest = _getVoteDigest(
            address(ethSigAuth),
            address(space),
            voter,
            proposalId,
            Choice.For,
            userVotingStrategies,
            voteMetadataUri
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(voterKey, digest);

        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataUri)
        );

        vm.expectRevert(UserHasAlreadyVoted.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataUri)
        );
    }

    function testAuthenticateVoteInvalidSelector() public {
        uint256 proposalId = 1;

        uint256 salt = 0;
        bytes32 digest = _getVoteDigest(
            address(ethSigAuth),
            address(space),
            voter,
            proposalId,
            Choice.For,
            userVotingStrategies,
            voteMetadataUri
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(voterKey, digest);

        vm.expectRevert(InvalidFunctionSelector.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataUri)
        );
    }

    function testAuthenticateUpdateProposal() public {
        space.setVotingDelay(10);
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        bytes32 digest = _getUpdateProposalDigest(
            address(ethSigAuth),
            address(space),
            author,
            proposalId,
            newStrategy,
            newMetadataUri
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(authorKey, digest);

        // vm.expectEmit(true, true, true, true);
        // emit ProposalUpdated(proposalId, newStrategy, newMetadataUri);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            UPDATE_PROPOSAL_SELECTOR,
            abi.encode(author, proposalId, newStrategy, newMetadataUri)
        );
    }

    function testAuthenticateUpdateProposalInvalidSignature() public {
        space.setVotingDelay(10);
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        bytes32 digest = _getUpdateProposalDigest(
            address(ethSigAuth),
            address(space),
            author,
            proposalId + 1, // proposalId + 1 will be invalid
            newStrategy,
            newMetadataUri
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(authorKey, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            UPDATE_PROPOSAL_SELECTOR,
            abi.encode(author, proposalId, newStrategy, newMetadataUri)
        );
    }

    function testAuthenticateUpdateProposalInvalidSelector() public {
        uint256 proposalId = 1;

        uint256 salt = 0;
        bytes32 digest = _getUpdateProposalDigest(
            address(ethSigAuth),
            address(space),
            author,
            proposalId,
            newStrategy,
            newMetadataUri
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(authorKey, digest);

        vm.expectRevert(InvalidFunctionSelector.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(author, proposalId, newStrategy, newMetadataUri)
        );
    }
}

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { AuthenticatorTest } from "./utils/Authenticator.t.sol";
import { SigUtils } from "./utils/SigUtils.sol";
import { EthSigAuthenticator } from "../src/authenticators/EthSigAuthenticator.sol";
import { Choice, IndexedStrategy } from "../src/types.sol";

contract EthSigAuthenticatorTest is SpaceTest, SigUtils {
    error InvalidSignature();
    error InvalidFunctionSelector();
    error SaltAlreadyUsed();

    string private constant NAME = "snapshot-x";
    string private constant VERSION = "1";
    string private newMetadataURI = "Test456";
    IndexedStrategy private newStrategy = IndexedStrategy(0, new bytes(0));

    EthSigAuthenticator public ethSigAuth;

    // solhint-disable-next-line no-empty-blocks
    constructor() SigUtils(NAME, VERSION) {}

    function setUp() public virtual override {
        super.setUp();

        // Adding the eth sig authenticator to the space
        ethSigAuth = new EthSigAuthenticator(NAME, VERSION);
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
            proposalMetadataURI,
            executionStrategy,
            userVotingStrategies,
            salt
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHOR_KEY, digest);

        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateProposeInvalidSigner() public {
        uint256 salt = 0;
        bytes32 digest = _getProposeDigest(
            address(ethSigAuth),
            address(space),
            address(author),
            proposalMetadataURI,
            executionStrategy,
            userVotingStrategies,
            salt
        );

        // Sign with a key that does not correspond to the proposal author's address
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(UNAUTHORIZED_KEY, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateInvalidSignature() public {
        uint256 salt = 0;
        // signing with a incorrect message
        bytes32 digest = _getProposeDigest(
            address(ethSigAuth),
            address(space),
            address(author),
            "invalid metadata URI",
            executionStrategy,
            userVotingStrategies,
            salt
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHOR_KEY, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateProposeReusedSignature() public {
        uint256 salt = 0;
        bytes32 digest = _getProposeDigest(
            address(ethSigAuth),
            address(space),
            address(author),
            proposalMetadataURI,
            executionStrategy,
            userVotingStrategies,
            salt
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHOR_KEY, digest);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies)
        );

        vm.expectRevert(SaltAlreadyUsed.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateProposeInvalidSelector() public {
        uint256 salt = 0;
        bytes32 digest = _getProposeDigest(
            address(ethSigAuth),
            address(space),
            address(author),
            proposalMetadataURI,
            executionStrategy,
            userVotingStrategies,
            salt
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHOR_KEY, digest);

        vm.expectRevert(InvalidFunctionSelector.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(author, proposalMetadataURI, executionStrategy, userVotingStrategies)
        );
    }

    function testAuthenticateVote() public {
        // Creating demo proposal using vanilla authenticator (both vanilla and eth sig authenticators are whitelisted)
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        bytes32 digest = _getVoteDigest(
            address(ethSigAuth),
            address(space),
            voter,
            proposalId,
            Choice.For,
            userVotingStrategies,
            voteMetadataURI
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(VOTER_KEY, digest);

        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );
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
            voteMetadataURI
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(UNAUTHORIZED_KEY, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
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
            voteMetadataURI
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(VOTER_KEY, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );
    }

    function testAuthenticateVoteReusedSignature() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        uint256 salt = 0;
        bytes32 digest = _getVoteDigest(
            address(ethSigAuth),
            address(space),
            voter,
            proposalId,
            Choice.For,
            userVotingStrategies,
            voteMetadataURI
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(VOTER_KEY, digest);

        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );

        vm.expectRevert(UserHasAlreadyVoted.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            VOTE_SELECTOR,
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
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
            voteMetadataURI
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(VOTER_KEY, digest);

        vm.expectRevert(InvalidFunctionSelector.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(voter, proposalId, Choice.For, userVotingStrategies, voteMetadataURI)
        );
    }

    function testAuthenticateUpdateProposal() public {
        space.setVotingDelay(10);
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        bytes32 digest = _getUpdateProposalDigest(
            address(ethSigAuth),
            address(space),
            author,
            proposalId,
            newStrategy,
            newMetadataURI
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHOR_KEY, digest);

        vm.expectEmit(true, true, true, true);
        emit ProposalUpdated(proposalId, newStrategy, newMetadataURI);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            UPDATE_PROPOSAL_SELECTOR,
            abi.encode(author, proposalId, newStrategy, newMetadataURI)
        );
    }

    function testAuthenticateUpdateProposalInvalidSignature() public {
        space.setVotingDelay(10);
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        bytes32 digest = _getUpdateProposalDigest(
            address(ethSigAuth),
            address(space),
            author,
            proposalId + 1, // proposalId + 1 will be invalid
            newStrategy,
            newMetadataURI
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHOR_KEY, digest);

        vm.expectRevert(InvalidSignature.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            0,
            address(space),
            UPDATE_PROPOSAL_SELECTOR,
            abi.encode(author, proposalId, newStrategy, newMetadataURI)
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
            newMetadataURI
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHOR_KEY, digest);

        vm.expectRevert(InvalidFunctionSelector.selector);
        ethSigAuth.authenticate(
            v,
            r,
            s,
            salt,
            address(space),
            bytes4(0xdeadbeef),
            abi.encode(author, proposalId, newStrategy, newMetadataURI)
        );
    }
}

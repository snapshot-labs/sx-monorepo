// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { Choice, IndexedStrategy } from "../src/types.sol";

contract UpdateProposalTest is SpaceTest {
    string internal newMetadataURI = "Testing123";
    IndexedStrategy internal newStrategy = IndexedStrategy(0, new bytes(0));

    function setUp() public virtual override {
        super.setUp();

        // Set the votingDelay to 10.
        votingDelay = 10;
        space.setVotingDelay(votingDelay);
    }

    function _updateProposal(
        address _author,
        uint256 _proposalId,
        IndexedStrategy memory _executionStrategy,
        string memory _metadataURI
    ) public {
        vanillaAuthenticator.authenticate(
            address(space),
            UPDATE_PROPOSAL_SELECTOR,
            abi.encode(_author, _proposalId, _executionStrategy, _metadataURI)
        );
    }

    function testUpdateProposal() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.expectEmit(true, true, true, true);
        emit ProposalUpdated(proposalId, newStrategy, newMetadataURI);

        // Update metadata.
        _updateProposal(author, proposalId, newStrategy, newMetadataURI);

        // Fast forward and finish the proposal to ensure everything is still working properly.
        vm.warp(block.timestamp + votingDelay);
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        space.execute(proposalId, executionStrategy.params);
    }

    function testUpdateProposalAfterDelay() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);
        vm.warp(block.timestamp + votingDelay);

        vm.expectRevert(VotingDelayHasPassed.selector);
        // Try to update metadata. Should fail.
        _updateProposal(author, proposalId, newStrategy, newMetadataURI);
    }

    function testUpdateProposalInvalidCaller() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.expectRevert(InvalidCaller.selector);
        _updateProposal(address(42), proposalId, newStrategy, newMetadataURI);
    }

    function testUpdateProposalUnauthenticated() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
        space.updateProposal(author, proposalId, newStrategy, newMetadataURI);
    }

    function testUpdateProposalInvalidStrategy() public {
        IndexedStrategy memory invalidStrategy = IndexedStrategy(42, new bytes(0));

        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
        space.updateProposal(author, proposalId, invalidStrategy, newMetadataURI);
    }
}

// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "./utils/Space.t.sol";
import "../src/types.sol";

contract updateProposalTest is SpaceTest {
    string newMetadataUri = "Testing123";
    IndexedStrategy newStrategy = IndexedStrategy(0, new bytes(0));

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
        string memory _metadataUri
    ) public {
        vanillaAuthenticator.authenticate(
            address(space),
            UPDATE_PROPOSAL_SELECTOR,
            abi.encode(_author, _proposalId, _executionStrategy, _metadataUri)
        );
    }

    function testUpdateProposal() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectEmit(true, true, true, true);
        emit ProposalUpdated(proposalId, newStrategy, newMetadataUri);

        // Update metadata.
        _updateProposal(author, proposalId, newStrategy, newMetadataUri);

        // Fast forward and finish the proposal to ensure everything is still working properly.
        vm.warp(block.timestamp + votingDelay);
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataUri);
        space.execute(proposalId, executionStrategy.params);
    }

    function testUpdateProposalAfterDelay() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        vm.warp(block.timestamp + votingDelay);

        vm.expectRevert(VotingDelayHasPassed.selector);
        // Try to update metadata. Should fail.
        _updateProposal(author, proposalId, newStrategy, newMetadataUri);
    }

    function testUpdateProposalInvalidCaller() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(InvalidCaller.selector);
        _updateProposal(address(42), proposalId, newStrategy, newMetadataUri);
    }

    function testUpdateProposalUnauthenticated() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
        space.updateProposal(author, proposalId, newStrategy, newMetadataUri);
    }

    function testUpdateProposalInvalidStrategy() public {
        IndexedStrategy memory invalidStrategy = IndexedStrategy(42, new bytes(0));

        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
        space.updateProposal(author, proposalId, invalidStrategy, newMetadataUri);
    }
}

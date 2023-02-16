// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "./utils/Space.t.sol";

contract SpaceOwnerActionsTest is SpaceTest {
    // ------- Cancel Proposal ----

    function testCancel() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies);

        vm.expectEmit(true, true, true, true);
        emit ProposalCancelled(proposalId);
        space.cancel(proposalId);
    }

    function testCancelInvalidProposal() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies);

        // proposal does not exist
        uint256 invalidProposalId = proposalId + 1;
        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        space.cancel(invalidProposalId);
    }

    function testCancelUnauthorized() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies);

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.cancel(proposalId);
    }

    function testCancelAlreadyExecuted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies);
        space.execute(proposalId, executionStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Executed));
        space.cancel(proposalId);
    }

    function testCancelAlreadyCancelled() public {
        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
        _vote(author, proposalId, Choice.For, userVotingStrategies);
        space.cancel(proposalId);

        vm.expectRevert(abi.encodeWithSelector(InvalidProposalStatus.selector, ProposalStatus.Cancelled));
        space.cancel(proposalId);
    }

    // ------- MaxVotingDuration ----

    function testSetMaxVotingDuration() public {
        uint32 nextDuration = maxVotingDuration + 1;
        vm.expectEmit(true, true, true, true);
        emit MaxVotingDurationUpdated(nextDuration);
        vm.prank(owner);
        space.setMaxVotingDuration(nextDuration);

        assertEq(space.maxVotingDuration(), nextDuration, "Max Voting Duration did not get updated");
    }

    function testSetMaxVotingDurationUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setMaxVotingDuration(2000);
    }

    function testSetMaxVotingDurationInvalid() public {
        space.setMinVotingDuration(1);

        vm.expectRevert(abi.encodeWithSelector(InvalidDuration.selector, 1, 0));
        vm.prank(owner);
        space.setMaxVotingDuration(0);
    }

    // ------- MinVotingDuration ----

    function testSetMinVotingDelay() public {
        uint32 nextDuration = minVotingDuration + 1;
        vm.expectEmit(true, true, true, true);
        emit MinVotingDurationUpdated(nextDuration);
        vm.prank(owner);
        space.setMinVotingDuration(nextDuration);

        assertEq(space.minVotingDuration(), nextDuration, "Min Voting Duration did not get updated");
    }

    function testSetMinVotingDurationUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setMinVotingDuration(2000);
    }

    function testSetMinVotingDurationInvalid() public {
        vm.expectRevert(abi.encodeWithSelector(InvalidDuration.selector, maxVotingDuration + 1, maxVotingDuration));
        vm.prank(owner);
        space.setMinVotingDuration(maxVotingDuration + 1);
    }

    // ------- MetadataUri ----

    function testSetMetadataUri() public {
        string memory newMetadataUri = "All your bases are belong to us";
        vm.expectEmit(true, true, true, true);
        emit MetadataUriUpdated(newMetadataUri);
        space.setMetadataUri(newMetadataUri);

        // Metadata Uri is not stored in the contract state so we can't check it
    }

    function testSetMetadataUriUnauthorized() public {
        string memory newMetadataUri = "All your bases are belong to us";
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setMetadataUri(newMetadataUri);
    }

    // ------- ProposalThreshold ----

    function testSetProposalThreshold() public {
        uint256 nextThreshold = 2;
        vm.expectEmit(true, true, true, true);
        emit ProposalThresholdUpdated(nextThreshold);
        vm.prank(owner);
        space.setProposalThreshold(nextThreshold);

        assertEq(space.proposalThreshold(), nextThreshold, "Proposal Threshold did not get updated");
    }

    function testSetProposalThresholdUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setProposalThreshold(2);
    }

    // ------- Quorum ----

    function testSetQuorum() public {
        uint256 newQuorum = 2;
        vm.expectEmit(true, true, true, true);
        emit QuorumUpdated(newQuorum);
        vm.prank(owner);
        space.setQuorum(newQuorum);

        assertEq(space.quorum(), newQuorum, "Quorum did not get updated");
    }

    function testSetQuorumUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setQuorum(2);
    }

    // ------- VotingDelay ----

    function testSetVotingDelay() public {
        uint32 nextDelay = 10;
        vm.expectEmit(true, true, true, true);
        emit VotingDelayUpdated(nextDelay);
        vm.prank(owner);
        space.setVotingDelay(nextDelay);

        assertEq(space.votingDelay(), nextDelay, "Voting Delay did not get updated");
    }

    function testSetVotingDelayUnauthorized() public {
        uint32 nextDelay = 10;
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setVotingDelay(nextDelay);
    }

    // ------- VotingStrategies ----

    function testAddAndRemoveVotingStrategies() public {
        // This voting strategy array contains the same voting strategy as the initial one but
        // should be accessed with a new strategy index.
        Strategy[] memory newVotingStrategies = new Strategy[](1);
        newVotingStrategies[0] = votingStrategies[0];

        // New strategy index should be `1` (`0` is used for the first one).
        uint8[] memory newIndices = new uint8[](1);
        newIndices[0] = 1;

        IndexedStrategy[] memory newUserVotingStrategies = new IndexedStrategy[](1);
        newUserVotingStrategies[0] = IndexedStrategy(newIndices[0], new bytes(0));

        vm.expectEmit(true, true, true, true);
        emit VotingStrategiesAdded(newVotingStrategies);
        vm.prank(owner);
        space.addVotingStrategies(newVotingStrategies);

        // Try creating a proposal using these new strategies.
        _createProposal(author, proposalMetadataUri, executionStrategy, newUserVotingStrategies);

        // Remove the voting strategies
        vm.expectEmit(true, true, true, true);
        emit VotingStrategiesRemoved(newIndices);
        space.removeVotingStrategies(newIndices);

        // Try creating a proposal using these strategies that were just removed.
        vm.expectRevert(abi.encodeWithSelector(InvalidVotingStrategyIndex.selector, 1));
        _createProposal(author, proposalMetadataUri, executionStrategy, newUserVotingStrategies);

        // Try creating a proposal with the previous voting strategy that was never removed.
        _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
    }

    function testAddVotingStrategiesUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.addVotingStrategies(votingStrategies);
    }

    function testRemoveVotingStrategiesUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        uint8[] memory empty = new uint8[](0);
        space.removeVotingStrategies(empty);
    }

    // ------- Authenticators ----
    function testAddAndRemoveAuthenticator() public {
        address[] memory newAuths = new address[](1);

        // Using this test contract as a mock authenticator
        newAuths[0] = address(this);

        vm.expectEmit(true, true, true, true);
        emit AuthenticatorsAdded(newAuths);
        space.addAuthenticators(newAuths);

        // The new authenticator is this contract so we can call `propose` directly.
        space.propose(author, proposalMetadataUri, executionStrategy, userVotingStrategies);

        vm.expectEmit(true, true, true, true);
        emit AuthenticatorsRemoved(newAuths);
        space.removeAuthenticators(newAuths);

        // Ensure we can't propose with this authenticator anymore
        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
        space.propose(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
    }

    function testAddAuthenticatorsUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.removeAuthenticators(authenticators);
    }

    function testRemoveAuthenticatorsUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.removeAuthenticators(authenticators);
    }

    // ------- ExecutionStrategies ----

    function testAddAndRemoveExecutionStrategies() public {
        Strategy[] memory newExecutionStrategies = new Strategy[](1);
        VanillaExecutionStrategy _vanilla = new VanillaExecutionStrategy();
        newExecutionStrategies[0] = Strategy(address(_vanilla), new bytes(0));

        address[] memory newExecutionStrategiesAddresses = new address[](1);
        newExecutionStrategiesAddresses[0] = newExecutionStrategies[0].addy;

        vm.expectEmit(true, true, true, true);
        emit ExecutionStrategiesAdded(newExecutionStrategiesAddresses);
        space.addExecutionStrategies(newExecutionStrategiesAddresses);

        uint256 proposalId = _createProposal(
            author,
            proposalMetadataUri,
            newExecutionStrategies[0],
            userVotingStrategies
        );

        _vote(author, proposalId, Choice.For, userVotingStrategies);

        // Ensure we can finalize
        space.execute(proposalId, newExecutionStrategies[0].params);

        // Remove this strategy
        vm.expectEmit(true, true, true, true);
        emit ExecutionStrategiesRemoved(newExecutionStrategiesAddresses);
        space.removeExecutionStrategies(newExecutionStrategiesAddresses);

        // Ensure we can't propose with this execution strategy anymore
        vm.expectRevert(
            abi.encodeWithSelector(ExecutionStrategyNotWhitelisted.selector, newExecutionStrategiesAddresses[0])
        );
        _createProposal(author, proposalMetadataUri, newExecutionStrategies[0], userVotingStrategies);
    }

    function testAddExecutionStrategyUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.removeExecutionStrategies(executionStrategies);
    }

    function testRemoveExecutionStrategyUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.removeExecutionStrategies(executionStrategies);
    }
}

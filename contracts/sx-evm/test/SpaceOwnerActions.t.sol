// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "./utils/Space.t.sol";

contract SpaceOwnerActionsTest is SpaceTest {
    // ------- MaxVotingDuration ----

    function testSetMaxVotingDuration() public {
        vm.expectEmit(true, true, true, true);
        uint32 nextDuration = maxVotingDuration + 1;
        emit MaxVotingDurationUpdated(maxVotingDuration, nextDuration);
        vm.prank(owner);
        space.setMaxVotingDuration(nextDuration);

        assertEq(space.maxVotingDuration(), nextDuration, "Max Voting Duration did not get updated");
    }

    function testUnauthorizedSetMaxVotingDelay() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setMaxVotingDuration(2000);
    }

    function testSetInvalidMaxVotingDelay() public {
        vm.expectRevert(abi.encodeWithSelector(InvalidDuration.selector, minVotingDuration, minVotingDuration - 1));
        vm.prank(owner);
        space.setMaxVotingDuration(minVotingDuration - 1);
    }

    // ------- MinVotingDuration ----

    function testSetMinVotingDelay() public {
        vm.expectEmit(true, true, true, true);
        uint32 nextDuration = minVotingDuration + 1;
        emit MinVotingDurationUpdated(minVotingDuration, nextDuration);
        vm.prank(owner);
        space.setMinVotingDuration(nextDuration);

        assertEq(space.minVotingDuration(), nextDuration, "Min Voting Duration did not get updated");
    }

    function testUnauthorizedSetMinVotingDuration() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setMinVotingDuration(2000);
    }

    function testSetInvalidMinVotingDuration() public {
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

    function testUnauthorizedSetMetadataUri() public {
        string memory newMetadataUri = "All your bases are belong to us";
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setMetadataUri(newMetadataUri);
    }

    // ------- ProposalThreshold ----

    function testSetProposalThreshold() public {
        uint256 nextThreshold = 2;
        vm.expectEmit(true, true, true, true);
        emit ProposalThresholdUpdated(proposalThreshold, nextThreshold);
        vm.prank(owner);
        space.setProposalThreshold(nextThreshold);

        assertEq(space.proposalThreshold(), nextThreshold, "Proposal Threshold did not get updated");
    }

    function testUnauthorizedSetProposalThreshold() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setProposalThreshold(2);
    }

    // ------- Quorum ----

    function testSetQuorum() public {
        uint256 newQuorum = 2;
        vm.expectEmit(true, true, true, true);
        emit QuorumUpdated(quorum, newQuorum);
        vm.prank(owner);
        space.setQuorum(newQuorum);

        assertEq(space.quorum(), newQuorum, "Quorum did not get updated");
    }

    function testUnauthorizedSetQuorum() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.setQuorum(2);
    }

    // ------- VotingDelay ----

    function testSetVotingDelay() public {
        uint32 nextDelay = 10;
        vm.expectEmit(true, true, true, true);
        emit VotingDelayUpdated(votingDelay, nextDelay);
        vm.prank(owner);
        space.setVotingDelay(nextDelay);

        assertEq(space.votingDelay(), nextDelay, "Voting Delay did not get updated");
    }

    function testUnauthorizedSetVotingDelay() public {
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
        vanillaAuthenticator.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, newUserVotingStrategies)
        );

        // Remove the voting strategies
        vm.expectEmit(true, true, true, true);
        emit VotingStrategiesRemoved(newIndices);
        space.removeVotingStrategies(newIndices);

        // Try creating a proposal using these strategies that were just removed.
        vm.expectRevert(abi.encodeWithSelector(InvalidVotingStrategyIndex.selector, 0));
        vanillaAuthenticator.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, newUserVotingStrategies)
        );

        // Try creating a proposal with the previous voting strategy that was never removed.
        vanillaAuthenticator.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, executionStrategy, userVotingStrategies)
        );
    }

    function testUnauthorizedAddVotingStrategies() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.addVotingStrategies(votingStrategies);
    }

    function testUnauthorizedRemoveVotingStrategies() public {
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

    function testUnauthorizedAddAuthenticators() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.removeAuthenticators(authenticators);
    }

    function testUnauthorizedRemoveAuthenticators() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.removeAuthenticators(authenticators);
    }

    // ------- ExecutionStrategies ----

    function testAddAndRemoveExecutionStrategies() public {
        // TODO: test finalizeProposal here once we have it
        address[] memory newExecutionStrategiesAddresses = new address[](1);
        newExecutionStrategiesAddresses[0] = address(42);

        Strategy[] memory newExecutionStrategies = new Strategy[](1);
        newExecutionStrategies[0] = Strategy(newExecutionStrategiesAddresses[0], new bytes(0));

        vm.expectEmit(true, true, true, true);
        emit ExecutionStrategiesAdded(newExecutionStrategiesAddresses);
        space.addExecutionStrategies(newExecutionStrategiesAddresses);

        vanillaAuthenticator.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, newExecutionStrategies[0], userVotingStrategies)
        );

        vm.expectEmit(true, true, true, true);
        emit ExecutionStrategiesRemoved(newExecutionStrategiesAddresses);
        space.removeExecutionStrategies(newExecutionStrategiesAddresses);

        // Ensure we cant propose with this execution strategy anymore
        vm.expectRevert(
            abi.encodeWithSelector(ExecutionStrategyNotWhitelisted.selector, newExecutionStrategiesAddresses[0])
        );

        vanillaAuthenticator.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(author, proposalMetadataUri, newExecutionStrategies[0], userVotingStrategies)
        );
    }

    function testUnauthorizedAddExecutionStrategy() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.removeExecutionStrategies(executionStrategiesAddresses);
    }

    function testUnauthorizedRemoveExecutionStrategy() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.removeExecutionStrategies(executionStrategiesAddresses);
    }
}

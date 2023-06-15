// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { SpaceV2 } from "./mocks/SpaceV2.sol";
import { SpaceTest } from "./utils/Space.t.sol";
import { Choice, IndexedStrategy, Strategy, UpdateSettingsCalldata } from "../src/types.sol";
import { VanillaExecutionStrategy } from "../src/execution-strategies/VanillaExecutionStrategy.sol";
import { BitPacker } from "../src/utils/BitPacker.sol";

contract SpaceOwnerActionsTest is SpaceTest {
    using BitPacker for uint256;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ------- Transfer Ownership -------

    function testTransferOwnership() public {
        address newOwner = address(2);
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(owner, newOwner);
        space.transferOwnership(newOwner);
    }

    function testTransferOwnershipInvalid() public {
        address newOwner = address(0);
        vm.expectRevert("Ownable: new owner is the zero address");
        space.transferOwnership(newOwner);
    }

    function testRenounceOwnership() public {
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(owner, address(0));
        space.renounceOwnership();
    }

    // ------- Cancel Proposal ----

    function testCancel() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        vm.expectEmit(true, true, true, true);
        emit ProposalCancelled(proposalId);
        space.cancel(proposalId);
    }

    function testCancelInvalidProposal() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        // proposal does not exist
        uint256 invalidProposalId = proposalId + 1;
        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        space.cancel(invalidProposalId);
    }

    function testCancelUnauthorized() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.cancel(proposalId);
    }

    function testCancelAlreadyExecuted() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        space.execute(proposalId, executionStrategy.params);

        vm.expectRevert(abi.encodeWithSelector(ProposalFinalized.selector));
        space.cancel(proposalId);
    }

    function testCancelAlreadyCancelled() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        _vote(author, proposalId, Choice.For, userVotingStrategies, voteMetadataURI);
        space.cancel(proposalId);

        vm.expectRevert(abi.encodeWithSelector(ProposalFinalized.selector));
        space.cancel(proposalId);
    }

    // ------- Update Unauthorized -------
    function testUpdateSettingsUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                2000,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
    }

    function testUpdateStrategiesUnauthorized() public {
        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(unauthorized);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
    }

    // ------- MaxVotingDuration ----

    function testSetMaxVotingDuration() public {
        uint32 nextDuration = maxVotingDuration + 1;
        vm.expectEmit(true, true, true, true);
        emit MaxVotingDurationUpdated(nextDuration);
        vm.prank(owner);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                nextDuration,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        assertEq(space.maxVotingDuration(), nextDuration, "Max Voting Duration did not get updated");
    }

    function testSetMaxVotingDurationInvalid() public {
        space.updateSettings(
            UpdateSettingsCalldata(
                1,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        vm.expectRevert(abi.encodeWithSelector(InvalidDuration.selector, 1, 0));
        vm.prank(owner);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                0,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
    }

    // ------- MinVotingDuration ----

    function testSetMinVotingDelay() public {
        uint32 nextDuration = minVotingDuration + 1;
        vm.expectEmit(true, true, true, true);
        emit MinVotingDurationUpdated(nextDuration);
        vm.prank(owner);
        space.updateSettings(
            UpdateSettingsCalldata(
                nextDuration,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        assertEq(space.minVotingDuration(), nextDuration, "Min Voting Duration did not get updated");
    }

    function testSetMinVotingDurationInvalid() public {
        vm.expectRevert(abi.encodeWithSelector(InvalidDuration.selector, maxVotingDuration + 1, maxVotingDuration));
        vm.prank(owner);
        space.updateSettings(
            UpdateSettingsCalldata(
                maxVotingDuration + 1,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
    }

    // ------- DaoURI ----
    function testSetDaoURI() public {
        string memory newDaoURI = "All your bases are belong to us";
        vm.expectEmit(true, true, true, true);
        emit DaoURIUpdated(newDaoURI);

        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                newDaoURI,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );
        assertEq(space.daoURI(), newDaoURI);
    }

    // ------- MetadataURI ----

    function testSetMetadataURI() public {
        string memory newMetadataURI = "All your bases are belong to us";
        vm.expectEmit(true, true, true, true);
        emit MetadataURIUpdated(newMetadataURI);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                newMetadataURI,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        // Metadata URI is not stored in the contract state so we can't check it
    }

    // ------- ProposalValidationStrategy ----

    function testSetProposalValidationStrategy() public {
        Strategy memory nextProposalValidationStrategy = Strategy(address(42), new bytes(0));
        vm.expectEmit(true, true, true, true);
        emit ProposalValidationStrategyUpdated(nextProposalValidationStrategy, "");
        vm.prank(owner);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                nextProposalValidationStrategy,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        Strategy memory newStrat = Strategy(address(42), new bytes(0));
        assertEq(
            newStrat.addr,
            nextProposalValidationStrategy.addr,
            "Proposal Validation Strategy did not get updated"
        );
    }

    // ------- VotingDelay ----

    function testSetVotingDelay() public {
        uint32 nextDelay = 10;
        vm.expectEmit(true, true, true, true);
        emit VotingDelayUpdated(nextDelay);
        vm.prank(owner);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                nextDelay,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        assertEq(space.votingDelay(), nextDelay, "Voting Delay did not get updated");
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

        string[] memory votingStrategyMetadataURIs = new string[](1);

        IndexedStrategy[] memory newUserVotingStrategies = new IndexedStrategy[](1);
        newUserVotingStrategies[0] = IndexedStrategy(newIndices[0], new bytes(0));

        vm.expectEmit(true, true, true, true);
        emit VotingStrategiesAdded(newVotingStrategies, votingStrategyMetadataURIs);
        vm.prank(owner);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                newVotingStrategies,
                votingStrategyMetadataURIs,
                NO_UPDATE_UINT8S
            )
        );

        // Create a proposal using the default proposal validation strategy
        uint256 proposalId1 = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        // Cast a vote with the new voting strategy.
        _vote(author, proposalId1, Choice.For, newUserVotingStrategies, voteMetadataURI);

        // Remove the voting strategies
        vm.expectEmit(true, true, true, true);
        emit VotingStrategiesRemoved(newIndices);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                newIndices
            )
        );

        // Create a proposal using the default proposal validation strategy
        uint256 proposalId2 = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));

        // Try voting on a proposal using the strategies that were just removed.
        vm.expectRevert(abi.encodeWithSelector(InvalidStrategyIndex.selector, 1));
        _vote(author, proposalId2, Choice.For, newUserVotingStrategies, voteMetadataURI);

        // Create a proposal with the default proposal validation strategy
        uint256 proposalId3 = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        // Cast a vote with the strategy that was never removed
        _vote(author, proposalId3, Choice.For, userVotingStrategies, voteMetadataURI);
    }

    function testRemoveAllVotingStrategies() public {
        uint8[] memory indices = new uint8[](1);
        indices[0] = 0;
        vm.expectRevert(NoActiveVotingStrategies.selector);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                indices
            )
        );
    }

    function testAddVotingStrategiesOverflow() public {
        Strategy[] memory newVotingStrategies = new Strategy[](1);
        newVotingStrategies[0] = votingStrategies[0];

        string[] memory newVotingStrategyMetadataURIs = new string[](1);
        newVotingStrategyMetadataURIs[0] = "fourty two";

        // Adding the maximum number of voting strategies (254, see the comments in `_addVotingStrategies`).
        for (uint256 i = 0; i < 254; i++) {
            space.updateSettings(
                UpdateSettingsCalldata(
                    NO_UPDATE_UINT32,
                    NO_UPDATE_UINT32,
                    NO_UPDATE_UINT32,
                    NO_UPDATE_STRING,
                    NO_UPDATE_STRING,
                    NO_UPDATE_STRATEGY,
                    "",
                    NO_UPDATE_ADDRESSES,
                    NO_UPDATE_ADDRESSES,
                    newVotingStrategies,
                    newVotingStrategyMetadataURIs,
                    NO_UPDATE_UINT8S
                )
            );
        }

        // There are now 256 strategies added to the space, Try adding one more
        vm.expectRevert(abi.encodeWithSelector(ExceedsStrategyLimit.selector));
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                newVotingStrategies,
                votingStrategyMetadataURIs,
                NO_UPDATE_UINT8S
            )
        );
    }

    function testAddVotingStrategiesInvalidAddress() public {
        Strategy[] memory newVotingStrategies = new Strategy[](1);
        string[] memory votingStrategyMetadataURIs = new string[](1);
        newVotingStrategies[0] = Strategy(address(0), new bytes(0));
        vm.expectRevert(ZeroAddress.selector);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                newVotingStrategies,
                votingStrategyMetadataURIs,
                NO_UPDATE_UINT8S
            )
        );
    }

    // ------- Authenticators ----
    function testAddAndRemoveAuthenticators() public {
        address[] memory newAuths = new address[](1);

        // Using this test contract as a mock authenticator
        newAuths[0] = address(this);

        vm.expectEmit(true, true, true, true);
        emit AuthenticatorsAdded(newAuths);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                newAuths,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        // The new authenticator is this contract so we can call `propose` directly.
        space.propose(author, proposalMetadataURI, executionStrategy, abi.encode(userVotingStrategies));

        vm.expectEmit(true, true, true, true);
        emit AuthenticatorsRemoved(newAuths);
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                newAuths,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        // Ensure we can't propose with this authenticator anymore
        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector));
        space.propose(author, proposalMetadataURI, executionStrategy, abi.encode(userVotingStrategies));
    }

    function testUpdateAuthenticators() public {
        address[] memory newAuths = new address[](2);
        newAuths[0] = address(111);
        newAuths[1] = address(222);

        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                newAuths,
                authenticators,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        // Ensure authenticators were correctly updated
        assertEq(space.authenticators(newAuths[0]), true);
        assertEq(space.authenticators(newAuths[1]), true);
        assertEq(space.authenticators(authenticators[0]), false);
    }

    function testUpdateVotingStrategies() public {
        Strategy[] memory _votingStrategiesToAdd = new Strategy[](2);
        _votingStrategiesToAdd[0] = Strategy(address(0xc), new bytes(0));
        _votingStrategiesToAdd[1] = Strategy(address(0xd), new bytes(0));

        string[] memory _votingStrategyMetadataURIsToAdd = new string[](2);
        _votingStrategyMetadataURIsToAdd[0] = "test456";
        _votingStrategyMetadataURIsToAdd[1] = "test789";

        uint8[] memory _indicesToRemove = new uint8[](1);
        _indicesToRemove[0] = 0;

        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                _votingStrategiesToAdd,
                _votingStrategyMetadataURIsToAdd,
                _indicesToRemove
            )
        );
        // Ensure voting strategies were correctly updated
        assertEq(space.activeVotingStrategies().isBitSet(0), false);
        assertEq(space.activeVotingStrategies().isBitSet(1), true);
        assertEq(space.activeVotingStrategies().isBitSet(2), true);
    }

    function testUpdateVotingStrategiesArrayLengthMismatch() public {
        Strategy[] memory _votingStrategiesToAdd = new Strategy[](2);
        _votingStrategiesToAdd[0] = Strategy(address(0xc), new bytes(0));
        _votingStrategiesToAdd[1] = Strategy(address(0xd), new bytes(0));

        // Mismatched array lengths between voting strategies and their metadata URIs
        string[] memory _votingStrategyMetadataURIsToAdd = new string[](1);
        _votingStrategyMetadataURIsToAdd[0] = "test456";

        uint8[] memory _indicesToRemove = new uint8[](1);
        _indicesToRemove[0] = 0;

        vm.expectRevert(abi.encodeWithSelector(ArrayLengthMismatch.selector));
        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                NO_UPDATE_STRATEGY,
                "",
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                _votingStrategiesToAdd,
                _votingStrategyMetadataURIsToAdd,
                _indicesToRemove
            )
        );
    }

    function testUpdateStrategies() public {
        Strategy memory _proposalValidationStrategy = Strategy(address(111), new bytes(0));

        address[] memory newAuths = new address[](2);
        newAuths[0] = address(111);
        newAuths[1] = address(222);

        Strategy[] memory _votingStrategiesToAdd = new Strategy[](2);
        _votingStrategiesToAdd[0] = Strategy(address(0xc), new bytes(0));
        _votingStrategiesToAdd[1] = Strategy(address(0xd), new bytes(0));

        string[] memory _votingStrategyMetadataURIsToAdd = new string[](2);
        _votingStrategyMetadataURIsToAdd[0] = "test456";
        _votingStrategyMetadataURIsToAdd[1] = "test789";

        uint8[] memory _indicesToRemove = new uint8[](1);
        _indicesToRemove[0] = 0;

        space.updateSettings(
            UpdateSettingsCalldata(
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_UINT32,
                NO_UPDATE_STRING,
                NO_UPDATE_STRING,
                _proposalValidationStrategy,
                "",
                newAuths,
                authenticators,
                _votingStrategiesToAdd,
                _votingStrategyMetadataURIsToAdd,
                _indicesToRemove
            )
        );

        // Ensure the proposal validation strategy was correctly updated
        (address addr, bytes memory params) = space.proposalValidationStrategy();
        assertEq(addr, _proposalValidationStrategy.addr);
        assertEq(params, _proposalValidationStrategy.params);

        // Ensure authenticators were correctly updated
        assertEq(space.authenticators(newAuths[0]), true);
        assertEq(space.authenticators(newAuths[1]), true);
        assertEq(space.authenticators(authenticators[0]), false);

        // Ensure voting strategies were correctly updated
        assertEq(space.activeVotingStrategies().isBitSet(0), false);
        assertEq(space.activeVotingStrategies().isBitSet(1), true);
        assertEq(space.activeVotingStrategies().isBitSet(2), true);
    }

    function testUpdateSettings() public {
        uint32 _maxVotingDuration = maxVotingDuration + 1;
        uint32 _minVotingDuration = minVotingDuration + 1;
        string memory _metadataURI = "test123";
        string memory _daoURI = "daoURI";
        uint32 _votingDelay = 42;

        vm.expectEmit(true, true, true, true);
        emit MetadataURIUpdated(_metadataURI);
        space.updateSettings(
            UpdateSettingsCalldata(
                _minVotingDuration,
                _maxVotingDuration,
                _votingDelay,
                _metadataURI,
                _daoURI,
                NO_UPDATE_STRATEGY,
                NO_UPDATE_STRING,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_ADDRESSES,
                NO_UPDATE_STRATEGIES,
                NO_UPDATE_STRINGS,
                NO_UPDATE_UINT8S
            )
        );

        // Ensure durations were correctly updated.
        assertEq(space.maxVotingDuration(), _maxVotingDuration);
        assertEq(space.minVotingDuration(), _minVotingDuration);

        // Ensure voting delay was correctly updated.
        assertEq(space.votingDelay(), _votingDelay);

        // Ensure daoURI was correcly updated.
        assertEq(space.daoURI(), _daoURI);
    }

    // ------- Upgrading a Space ----

    event Upgraded(address indexed implementation);

    function testSpaceUpgrade() public {
        SpaceV2 spaceV2Implementation = new SpaceV2();

        vm.expectEmit(true, true, true, true);
        emit Upgraded(address(spaceV2Implementation));

        space.upgradeTo(address(spaceV2Implementation));

        // casting Space to SpaceV2
        SpaceV2 space = SpaceV2(address(space));

        // testing new functionality added in V2
        assertEq(space.getMagicNumber(), 0);
        space.setMagicNumber(42);
        assertEq(space.getMagicNumber(), 42);
    }

    function testSpaceUpgradeUnauthorized() public {
        SpaceV2 spaceV2Implementation = new SpaceV2();
        vm.prank(unauthorized);
        vm.expectRevert("Ownable: caller is not the owner");
        space.upgradeTo(address(spaceV2Implementation));
    }
}

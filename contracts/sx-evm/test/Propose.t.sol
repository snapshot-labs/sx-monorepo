// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "./utils/Space.t.sol";

contract ProposeTest is SpaceTest {
    function testPropose() public {
        uint256 proposalId = space.nextProposalId();

        bytes32 executionHash = keccak256(abi.encodePacked(executionStrategy.params));
        uint32 snapshotTimestamp = uint32(block.timestamp);
        uint32 startTimestamp = uint32(snapshotTimestamp + votingDelay);
        uint32 minEndTimestamp = uint32(startTimestamp + minVotingDuration);
        uint32 maxEndTimestamp = uint32(startTimestamp + maxVotingDuration);

        // Expected content of the proposal struct
        Proposal memory proposal = Proposal(
            quorum,
            snapshotTimestamp,
            startTimestamp,
            minEndTimestamp,
            maxEndTimestamp,
            executionHash,
            executionStrategy.addy,
            FinalizationStatus.NotExecuted,
            votingStrategies
        );

        vm.expectEmit(true, true, true, true);
        emit ProposalCreated(proposalId, author, proposal, proposalMetadataUri, executionStrategy.params);

        uint256 actualProposalId = _createProposal(
            author,
            proposalMetadataUri,
            executionStrategy,
            userVotingStrategies
        );

        // Actual content of the proposal struct
        Proposal memory _proposal = space.getProposal(proposalId);

        // Checking expectations and actual values match
        assertEq(_proposal.quorum, proposal.quorum, "Quorum not set properly");
        assertEq(_proposal.startTimestamp, proposal.startTimestamp, "StartTimestamp not set properly");
        assertEq(_proposal.minEndTimestamp, proposal.minEndTimestamp, "MinEndTimestamp not set properly");
        assertEq(_proposal.maxEndTimestamp, proposal.maxEndTimestamp, "MaxEndTimestamp not set properly");
        assertEq(_proposal.executionStrategy, proposal.executionStrategy, "ExecutionStrategy not set properly");
        assertEq(_proposal.executionHash, proposal.executionHash, "Execution Hash not computed properly");
    }

    function testProposeInvalidAuth() public {
        //  Using this contract as an authenticator, which is not whitelisted
        vm.expectRevert(abi.encodeWithSelector(AuthenticatorNotWhitelisted.selector, address(this)));
        space.propose(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
    }

    function testProposeInvalidExecutionStrategy() public {
        Strategy[] memory invalidExecutionStrategies = new Strategy[](1);
        invalidExecutionStrategies[0] = Strategy(address(42), new bytes(0));
        vm.expectRevert(
            abi.encodeWithSelector(ExecutionStrategyNotWhitelisted.selector, invalidExecutionStrategies[0].addy)
        );

        _createProposal(author, proposalMetadataUri, invalidExecutionStrategies[0], userVotingStrategies);
    }

    function testProposeInvalidUserVotingStrategy() public {
        IndexedStrategy[] memory invalidUsedStrategies = new IndexedStrategy[](1);
        invalidUsedStrategies[0] = IndexedStrategy(42, new bytes(0));

        // out of bounds revert
        vm.expectRevert();
        _createProposal(author, proposalMetadataUri, executionStrategy, invalidUsedStrategies);
    }

    function testProposeDuplicateUserVotingStrategy() public {
        IndexedStrategy[] memory invalidUsedStrategies = new IndexedStrategy[](4);
        invalidUsedStrategies[0] = IndexedStrategy(0, new bytes(0));
        invalidUsedStrategies[1] = IndexedStrategy(1, new bytes(0));
        invalidUsedStrategies[2] = IndexedStrategy(2, new bytes(0));
        invalidUsedStrategies[3] = IndexedStrategy(0, new bytes(0)); // Duplicate index

        vm.expectRevert(abi.encodeWithSelector(DuplicateFound.selector, 0, 0));
        _createProposal(author, proposalMetadataUri, executionStrategy, invalidUsedStrategies);
    }

    function testProposeMultipleStrategies() public {
        VanillaVotingStrategy strat2 = new VanillaVotingStrategy();
        VanillaVotingStrategy strat3 = new VanillaVotingStrategy();
        Strategy[] memory toAdd = new Strategy[](2);
        toAdd[0] = Strategy(address(strat2), new bytes(0));
        toAdd[1] = Strategy(address(strat2), new bytes(0));

        space.addVotingStrategies(toAdd);

        IndexedStrategy[] memory newVotingStrategies = new IndexedStrategy[](3);
        newVotingStrategies[0] = userVotingStrategies[0]; // base strat
        newVotingStrategies[1] = IndexedStrategy(1, new bytes(0)); // strat2
        newVotingStrategies[2] = IndexedStrategy(2, new bytes(0)); // strat3

        uint256 proposalId = _createProposal(author, proposalMetadataUri, executionStrategy, userVotingStrategies);
    }
}

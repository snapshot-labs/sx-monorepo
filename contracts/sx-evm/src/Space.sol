// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/access/Ownable.sol";

import "src/interfaces/ISpace.sol";
import "src/types.sol";
import "src/interfaces/IVotingStrategy.sol";
import "src/interfaces/IExecutionStrategy.sol";

/**
 * @author  SnapshotLabs
 * @title   Space Contract.
 * @notice  Logic and bookkeeping contract.
 */
contract Space is ISpace, Ownable {
    // Maximum duration a proposal can last.
    uint32 public maxVotingDuration;
    // Minimum duration a proposal can last.
    uint32 public minVotingDuration;
    // Next proposal nonce, increased by one everytime a new proposal is created.
    uint256 public nextProposalId;
    // Minimum voting power required by a user to create a new proposal (used to prevent proposal spamming).
    uint256 public proposalThreshold;
    // Total voting power that needs to participate to a vote for a vote to be considered valid.
    uint256 public quorum;
    // Delay between when the proposal is created and when the voting period starts for this proposal.
    uint32 public votingDelay;

    // Array of available voting strategies that users can use to determine their voting power.
    /// @dev This needs to be an array because a mapping would limit a space to only one use per
    ///      voting strategy contract.
    Strategy[] private votingStrategies;

    // Mapping of allowed execution strategies.
    mapping(address => bool) private executionStrategies;
    // Mapping of allowed authenticators.
    mapping(address => bool) private authenticators;
    // Mapping of all `Proposal`s of this space (past and present).
    mapping(uint256 => Proposal) private proposalRegistry;
    // Mapping used to know if a voter already voted on a specific proposal. Here to prevent double voting.
    mapping(uint256 => mapping(address => bool)) private voteRegistry;
    // Mapping used to check the current voting power in favor of a `Choice` for a specific proposal.
    mapping(uint256 => mapping(Choice => uint256)) private votePower;

    // ------------------------------------
    // |                                  |
    // |          CONSTRUCTOR             |
    // |                                  |
    // ------------------------------------

    constructor(
        address _controller,
        uint32 _votingDelay,
        uint32 _minVotingDuration,
        uint32 _maxVotingDuration,
        uint256 _proposalThreshold,
        uint256 _quorum,
        Strategy[] memory _votingStrategies,
        address[] memory _authenticators,
        address[] memory _executionStrategies
    ) {
        if (_minVotingDuration > _maxVotingDuration) revert InvalidDuration(_minVotingDuration, _maxVotingDuration);
        if (_authenticators.length == 0) revert EmptyArray();
        if (_executionStrategies.length == 0) revert EmptyArray();

        transferOwnership(_controller);
        votingDelay = _votingDelay;
        minVotingDuration = _minVotingDuration;
        maxVotingDuration = _maxVotingDuration;
        proposalThreshold = _proposalThreshold;
        quorum = _quorum;
        _addVotingStrategies(_votingStrategies);
        _addAuthenticators(_authenticators);
        _addExecutionStrategies(_executionStrategies);

        nextProposalId = 1;

        // No event events emitted here because the constructor is called by the factory,
        // which emits a space creation event.
    }

    // ------------------------------------
    // |                                  |
    // |            INTERNAL              |
    // |                                  |
    // ------------------------------------

    /**
     * @notice  Internal function to add voting strategies.
     * @dev     `_votingStrategies` should not be set to `0`.
     * @param   _votingStrategies  Array of voting strategies to add.
     */
    function _addVotingStrategies(Strategy[] memory _votingStrategies) internal {
        if (_votingStrategies.length == 0) revert EmptyArray();

        for (uint256 i = 0; i < _votingStrategies.length; i++) {
            // A voting strategy set to 0 is used to indicate that the voting strategy is no longer active,
            // so we need to prevent the user from adding a null invalid strategy address.
            if (_votingStrategies[i].addy == address(0)) revert InvalidVotingStrategyAddress();
            votingStrategies.push(_votingStrategies[i]);
        }
    }

    /**
     * @notice  Internal function to remove voting strategies.
     * @dev     Does not shrink the array but simply sets the values to 0.
     * @param   indicesToRemove  Indices of the strategies to remove.
     */
    function _removeVotingStrategies(uint8[] memory indicesToRemove) internal {
        for (uint8 i = 0; i < indicesToRemove.length; i++) {
            votingStrategies[indicesToRemove[i]].addy = address(0);
            votingStrategies[indicesToRemove[i]].params = new bytes(0);
        }

        // TODO: should we check that there are still voting strategies left after this?
    }

    /**
     * @notice  Internal function to add authenticators.
     * @param   _authenticators  Array of authenticators to add.
     */
    function _addAuthenticators(address[] memory _authenticators) internal {
        for (uint256 i = 0; i < _authenticators.length; i++) {
            authenticators[_authenticators[i]] = true;
        }
    }

    /**
     * @notice  Internal function to remove authenticators.
     * @param   _authenticators  Array of authenticators to remove.
     */
    function _removeAuthenticators(address[] memory _authenticators) internal {
        for (uint256 i = 0; i < _authenticators.length; i++) {
            authenticators[_authenticators[i]] = false;
        }
        // TODO: should we check that there are still authenticators left? same for other setters..
    }

    /**
     * @notice  Internal function to add exection strategies.
     * @param   _executionStrategies  Array of exectuion strategies to add.
     */
    function _addExecutionStrategies(address[] memory _executionStrategies) internal {
        for (uint256 i = 0; i < _executionStrategies.length; i++) {
            executionStrategies[_executionStrategies[i]] = true;
        }
    }

    /**
     * @notice  Internal function to remove execution strategies.
     * @param   _executionStrategies  Array of execution strategies to remove.
     */
    function _removeExecutionStrategies(address[] memory _executionStrategies) internal {
        for (uint256 i = 0; i < _executionStrategies.length; i++) {
            executionStrategies[_executionStrategies[i]] = false;
        }
    }

    /**
     * @notice  Internal function to ensure `msg.sender` is in the list of allowed authenticators.
     */
    function _assertValidAuthenticator() internal view {
        if (authenticators[msg.sender] != true) revert AuthenticatorNotWhitelisted(msg.sender);
    }

    /**
     * @notice  Internal function to ensure `executionStrategy` is in the list of allowed execution strategies.
     * @param   executionStrategyAddress  The execution strategy to check.
     */
    function _assertValidExecutionStrategy(address executionStrategyAddress) internal view {
        if (executionStrategies[executionStrategyAddress] != true)
            revert ExecutionStrategyNotWhitelisted(executionStrategyAddress);
    }

    /**
     * @notice  Internal function that checks if `proposalId` exists or not.
     * @param   proposal  The proposal to check.
     */
    function _assertProposalExists(Proposal memory proposal) internal pure {
        // startTimestamp cannot be set to 0 when a proposal is created,
        // so if proposal.startTimestamp is 0 it means this proposal does not exist
        // and hence `proposalId` is invalid.
        if (proposal.startTimestamp == 0) revert InvalidProposal();
    }

    /**
     * @notice  Internal function to ensure there are no duplicates in an array of `UserVotingStrategy`.
     * @dev     No way to declare a mapping in memory so we need to use an array and go for O(n^2)...
     * @param   strats  Array to check for duplicates.
     */
    function _assertNoDuplicateIndices(IndexedStrategy[] memory strats) internal pure {
        if (strats.length > 0) {
            for (uint256 i = 0; i < strats.length - 1; i++) {
                for (uint256 j = i + 1; j < strats.length; j++) {
                    if (strats[i].index == strats[j].index) revert DuplicateFound(strats[i].index, strats[j].index);
                }
            }
        }
    }

    /**
     * @notice  Internal function that will loop over the used voting strategies and
                return the cumulative voting power of a user.
     * @dev     
     * @param   timestamp  Timestamp of the snapshot.
     * @param   userAddress  Address for which to compute the voting power.
     * @param   userVotingStrategies The desired voting strategies to check.
     * @return  uint256  The total voting power of a user (over those specified voting strategies).
     */
    function _getCumulativeVotingPower(
        uint32 timestamp,
        address userAddress,
        IndexedStrategy[] calldata userVotingStrategies
    ) internal returns (uint256) {
        // Ensure there are no duplicates to avoid an attack where people double count a voting strategy
        _assertNoDuplicateIndices(userVotingStrategies);

        uint256 totalVotingPower = 0;
        for (uint256 i = 0; i < userVotingStrategies.length; i++) {
            uint256 index = userVotingStrategies[i].index;
            Strategy memory votingStrategy = votingStrategies[index];
            // A strategyAddress set to 0 indicates that this address has already been removed and is
            // no longer a valid voting strategy. See `_removeVotingStrategies`.
            if (votingStrategy.addy == address(0)) revert InvalidVotingStrategyIndex(i);
            IVotingStrategy strategy = IVotingStrategy(votingStrategy.addy);

            // With solc 0.8, this will revert in case of overflow.
            totalVotingPower += strategy.getVotingPower(
                timestamp,
                userAddress,
                votingStrategy.params,
                userVotingStrategies[i].params
            );
        }

        return totalVotingPower;
    }

    /**
     * @notice  Returns some information regarding state of quorum and votes.
     * @param   _quorum  The quorum to reach.
     * @param   _proposalId  The proposal id.
     * @return  bool  Whether or not the quorum has been reached.
     * TODO: Is this function useful? Doesnt seem like a particularly useful abstraction.
     */
    function _quorumInfo(uint256 _quorum, uint256 _proposalId) internal view returns (bool, uint256, uint256, uint256) {
        uint256 votesFor = votePower[_proposalId][Choice.For];
        uint256 votesAgainst = votePower[_proposalId][Choice.Against];
        uint256 votesAbstain = votePower[_proposalId][Choice.Abstain];

        // With solc 0.8, this will revert if an overflow occurs.
        uint256 total = votesFor + votesAgainst + votesAbstain;

        bool quorumReached = total >= _quorum;

        return (quorumReached, votesFor, votesAgainst, votesAbstain);
    }

    // ------------------------------------
    // |                                  |
    // |             SETTERS              |
    // |                                  |
    // ------------------------------------

    function setController(address _newController) external override onlyOwner {
        transferOwnership(_newController);
        emit ControllerUpdated(owner(), _newController);
    }

    function setMaxVotingDuration(uint32 _maxVotingDuration) external override onlyOwner {
        if (_maxVotingDuration < minVotingDuration) revert InvalidDuration(minVotingDuration, _maxVotingDuration);
        emit MaxVotingDurationUpdated(maxVotingDuration, _maxVotingDuration);

        maxVotingDuration = _maxVotingDuration;
    }

    function setMinVotingDuration(uint32 _minVotingDuration) external override onlyOwner {
        if (_minVotingDuration > maxVotingDuration) revert InvalidDuration(_minVotingDuration, maxVotingDuration);

        emit MinVotingDurationUpdated(minVotingDuration, _minVotingDuration);

        minVotingDuration = _minVotingDuration;
    }

    function setMetadataUri(string calldata _metadataUri) external override onlyOwner {
        emit MetadataUriUpdated(_metadataUri);
    }

    function setProposalThreshold(uint256 _threshold) external override onlyOwner {
        emit ProposalThresholdUpdated(proposalThreshold, _threshold);

        proposalThreshold = _threshold;
    }

    function setQuorum(uint256 _quorum) external override onlyOwner {
        emit QuorumUpdated(quorum, _quorum);
        quorum = _quorum;
    }

    function setVotingDelay(uint32 _votingDelay) external override onlyOwner {
        emit VotingDelayUpdated(votingDelay, _votingDelay);

        votingDelay = _votingDelay;
        // TODO: check it's not too big?
    }

    function addVotingStrategies(Strategy[] calldata _votingStrategies) external override onlyOwner {
        _addVotingStrategies(_votingStrategies);
        emit VotingStrategiesAdded(_votingStrategies);
    }

    function removeVotingStrategies(uint8[] calldata indicesToRemove) external override onlyOwner {
        _removeVotingStrategies(indicesToRemove);
        emit VotingStrategiesRemoved(indicesToRemove);
    }

    function addAuthenticators(address[] calldata _authenticators) external override onlyOwner {
        _addAuthenticators(_authenticators);
        emit AuthenticatorsAdded(_authenticators);
    }

    function removeAuthenticators(address[] calldata _authenticators) external override onlyOwner {
        _removeAuthenticators(_authenticators);
        emit AuthenticatorsRemoved(_authenticators);
    }

    function addExecutionStrategies(address[] calldata _executionStrategies) external override onlyOwner {
        _addExecutionStrategies(_executionStrategies);
        emit ExecutionStrategiesAdded(_executionStrategies);
    }

    function removeExecutionStrategies(address[] calldata _executionStrategies) external override onlyOwner {
        _removeExecutionStrategies(_executionStrategies);
        emit ExecutionStrategiesRemoved(_executionStrategies);
    }

    // ------------------------------------
    // |                                  |
    // |             GETTERS              |
    // |                                  |
    // ------------------------------------

    function getController() external view override returns (address) {
        return owner();
    }

    function getProposal(uint256 proposalId) external view override returns (Proposal memory) {
        Proposal memory proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        return (proposal);
    }

    function getProposalStatus(uint256 proposalId) external view override returns (ProposalStatus) {
        Proposal memory proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        (bool quorumReached, , , ) = _quorumInfo(proposal.quorum, proposalId);

        if (proposal.finalizationStatus == FinalizationStatus.NotExecuted) {
            // Proposal has not been executed yet. Let's look at the current timestamp.
            uint256 current = block.timestamp;
            if (current < proposal.startTimestamp) {
                // Not started yet.
                return ProposalStatus.WaitingForVotingPeriodToStart;
            } else if (current > proposal.maxEndTimestamp) {
                // Voting period is over, this proposal is waiting to be finalized.
                return ProposalStatus.Finalizable;
            } else {
                // We are somewhere between `proposal.startTimestamp` and `proposal.maxEndTimestamp`.
                if (current > proposal.minEndTimestamp) {
                    // We've passed `proposal.minEndTimestamp`, check if quorum has been reached.
                    if (quorumReached) {
                        // Quorum has been reached, this proposal is finalizable.
                        return ProposalStatus.VotingPeriodFinalizable;
                    } else {
                        // Quorum has not been reached so this proposal is NOT finalizable yet.
                        return ProposalStatus.VotingPeriod;
                    }
                } else {
                    // `proposal.minEndTimestamp` not reached, so we're just in the regular Voting Period.
                    return ProposalStatus.VotingPeriod;
                }
            }
        } else {
            // Proposal has been executed. Since `FinalizationStatus` and `ProposalStatus` only differ by
            // one, we can safely cast it by substracting 1.
            return ProposalStatus(uint8(proposal.finalizationStatus) - 1);
        }
    }

    function hasVoted(uint256 proposalId, address voter) external view override returns (bool) {
        Proposal memory proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        return voteRegistry[proposalId][voter];
    }

    // ------------------------------------
    // |                                  |
    // |             CORE                 |
    // |                                  |
    // ------------------------------------

    /**
     * @notice  Create a proposal.
     * @param   proposerAddress  The address of the proposal creator.
     * @param   metadataUri  The metadata URI for the proposal.
     * @param   executionStrategy  The execution contract and associated execution parameters to use for this proposal.
     * @param   userVotingStrategies  Strategies to use to compute the proposer voting power.
     */
    function propose(
        address proposerAddress,
        string calldata metadataUri,
        Strategy calldata executionStrategy,
        IndexedStrategy[] calldata userVotingStrategies
    ) external override {
        _assertValidAuthenticator();
        _assertValidExecutionStrategy(executionStrategy.addy);

        // Casting to `uint32` is fine because this gives us until year ~2106.
        uint32 snapshotTimestamp = uint32(block.timestamp);

        uint256 votingPower = _getCumulativeVotingPower(snapshotTimestamp, proposerAddress, userVotingStrategies);
        if (votingPower < proposalThreshold) revert ProposalThresholdNotReached(votingPower);

        uint32 startTimestamp = snapshotTimestamp + votingDelay;
        uint32 minEndTimestamp = startTimestamp + minVotingDuration;
        uint32 maxEndTimestamp = startTimestamp + maxVotingDuration;

        bytes32 executionHash = keccak256(executionStrategy.params);

        Proposal memory proposal = Proposal(
            quorum,
            snapshotTimestamp,
            startTimestamp,
            minEndTimestamp,
            maxEndTimestamp,
            executionHash,
            executionStrategy.addy,
            FinalizationStatus.NotExecuted
        );

        proposalRegistry[nextProposalId] = proposal;
        emit ProposalCreated(nextProposalId, proposerAddress, proposal, metadataUri, executionStrategy.params);

        nextProposalId++;
    }

    /**
     * @notice  Cast a vote
     * @param   voterAddress  Voter's address.
     * @param   proposalId  Proposal id.
     * @param   choice  Choice can be `For`, `Against` or `Abstain`.
     * @param   userVotingStrategies  Strategies to use to compute the voter's voting power.
     */
    function vote(
        address voterAddress,
        uint256 proposalId,
        Choice choice,
        IndexedStrategy[] calldata userVotingStrategies
    ) external override {
        _assertValidAuthenticator();

        Proposal memory proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        if (proposal.finalizationStatus != FinalizationStatus.NotExecuted) revert ProposalAlreadyExecuted();

        uint32 currentTimestamp = uint32(block.timestamp);

        if (currentTimestamp >= proposal.maxEndTimestamp) revert VotingPeriodHasEnded();
        if (currentTimestamp < proposal.startTimestamp) revert VotingPeriodHasNotStarted();

        // Ensure voter has not already voted.
        if (voteRegistry[proposalId][voterAddress] == true) revert UserHasAlreadyVoted();

        uint256 votingPower = _getCumulativeVotingPower(proposal.snapshotTimestamp, voterAddress, userVotingStrategies);

        if (votingPower == 0) revert UserHasNoVotingPower();

        uint256 previousVotingPower = votePower[proposalId][choice];
        // With solc 0.8, this will revert if an overflow occurs.
        uint256 newVotingPower = previousVotingPower + votingPower;

        votePower[proposalId][choice] = newVotingPower;
        voteRegistry[proposalId][voterAddress] = true;

        Vote memory userVote = Vote(choice, votingPower);
        emit VoteCreated(proposalId, voterAddress, userVote);
    }

    /**
     * @notice  Finalize a proposal.
     * @param   proposalId  The proposal to cancel
     * @param   executionParams  The execution parameters, as described in `propose()`.
     */
    function finalizeProposal(uint256 proposalId, bytes calldata executionParams) external override {
        // TODO: check if we should use `memory` here and only use `storage` in the end
        // of this function when we actually modify the proposal
        Proposal storage proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        if (proposal.finalizationStatus != FinalizationStatus.NotExecuted) revert ProposalAlreadyExecuted();

        uint32 currentTimestamp = uint32(block.timestamp);

        if (proposal.minEndTimestamp > currentTimestamp) revert MinVotingDurationHasNotElapsed();

        bytes32 recoveredHash = keccak256(executionParams);
        if (proposal.executionHash != recoveredHash) revert ExecutionHashMismatch();

        (bool quorumReached, uint256 votesFor, uint256 votesAgainst, ) = _quorumInfo(proposal.quorum, proposalId);

        ProposalOutcome proposalOutcome;
        if (quorumReached) {
            // Quorum has been reached, determine if proposal should be accepted or rejected.
            if (votesFor > votesAgainst) {
                proposalOutcome = ProposalOutcome.Accepted;
            } else {
                proposalOutcome = ProposalOutcome.Rejected;
            }
        } else {
            // Quorum not reached, check to see if the voting period is over.
            if (currentTimestamp < proposal.maxEndTimestamp) {
                // Voting period is not over yet; revert.
                revert QuorumNotReachedYet();
            } else {
                // Voting period has ended but quorum wasn't reached: set outcome to `REJECTED`.
                proposalOutcome = ProposalOutcome.Rejected;
            }
        }

        // Ensure the execution strategy is still valid.
        if (executionStrategies[proposal.executionStrategy] == false) {
            proposalOutcome = ProposalOutcome.Cancelled;
        }

        IExecutionStrategy(proposal.executionStrategy).execute(proposalOutcome, executionParams);

        // TODO: should we set votePower[proposalId][choice] to 0 to get some nice ETH refund?
        // `ProposalOutcome` and `FinalizatonStatus` are almost the same enum except from their first
        // variant, so by adding `1` we will get the corresponding `FinalizationStatus`.
        proposal.finalizationStatus = FinalizationStatus(uint8(proposalOutcome) + 1);

        emit ProposalFinalized(proposalId, proposalOutcome);
    }

    /**
     * @notice  Cancel a proposal. Only callable by the owner.
     * @param   proposalId  The proposal to cancel
     * @param   executionParams  The execution parameters, as described in `propose()`.
     */
    function cancelProposal(uint256 proposalId, bytes calldata executionParams) external override onlyOwner {
        Proposal storage proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        if (proposal.finalizationStatus != FinalizationStatus.NotExecuted) revert ProposalAlreadyExecuted();

        bytes32 recoveredHash = keccak256(executionParams);
        if (proposal.executionHash != recoveredHash) revert ExecutionHashMismatch();

        ProposalOutcome proposalOutcome = ProposalOutcome.Cancelled;

        IExecutionStrategy(proposal.executionStrategy).execute(proposalOutcome, executionParams);

        proposal.finalizationStatus = FinalizationStatus.FinalizedAndCancelled;
        emit ProposalFinalized(proposalId, proposalOutcome);
    }
}

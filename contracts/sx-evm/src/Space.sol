// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import { ISpace } from "src/interfaces/ISpace.sol";
import { Choice, FinalizationStatus, IndexedStrategy, Proposal, ProposalStatus, Strategy, Vote } from "src/types.sol";
import { IVotingStrategy } from "src/interfaces/IVotingStrategy.sol";
import { IExecutionStrategy } from "src/interfaces/IExecutionStrategy.sol";

/**
 * @author  SnapshotLabs
 * @title   Space Contract.
 * @notice  Logic and bookkeeping contract.
 */
contract Space is ISpace, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuard {
    // Maximum duration a proposal can last.
    uint32 public maxVotingDuration;
    // Minimum duration a proposal can last.
    uint32 public minVotingDuration;
    // Next proposal nonce, increased by one every time a new proposal is created.
    uint256 public nextProposalId;
    // Minimum voting power required by a user to create a new proposal (used to prevent proposal spamming).
    uint256 public proposalThreshold;
    // Delay between when the proposal is created and when the voting period starts for this proposal.
    uint32 public votingDelay;

    // Array of available voting strategies that users can use to determine their voting power.
    /// @dev This needs to be an array because a mapping would limit a space to only one use per
    ///      voting strategy contract.
    Strategy[] private votingStrategies;

    // Array of available execution strategies that proposal authors can use to determine how to execute a proposal.
    Strategy[] private executionStrategies;

    // Mapping of allowed authenticators.
    mapping(address auth => bool allowed) private authenticators;
    // Mapping of all `Proposal`s of this space (past and present).
    mapping(uint256 proposalId => Proposal proposal) private proposalRegistry;
    // Mapping used to know if a voter already voted on a specific proposal. Here to prevent double voting.
    mapping(uint256 proposalId => mapping(address voter => bool hasVoted)) private voteRegistry;
    // Mapping used to check the current voting power in favor of a `Choice` for a specific proposal.
    mapping(uint256 proposalId => mapping(Choice choice => uint256 votePower)) private votePower;

    // ------------------------------------
    // |                                  |
    // |          CONSTRUCTOR             |
    // |                                  |
    // ------------------------------------

    function initialize(
        address _controller,
        uint32 _votingDelay,
        uint32 _minVotingDuration,
        uint32 _maxVotingDuration,
        uint256 _proposalThreshold,
        string memory _metadataUri,
        Strategy[] memory _votingStrategies,
        bytes[] memory _votingStrategyMetadata,
        address[] memory _authenticators,
        Strategy[] memory _executionStrategies
    ) public initializer {
        __Ownable_init();
        transferOwnership(_controller);
        _setMaxVotingDuration(_maxVotingDuration);
        _setMinVotingDuration(_minVotingDuration);
        _setProposalThreshold(_proposalThreshold);
        _setVotingDelay(_votingDelay);
        _addVotingStrategies(_votingStrategies);
        _addAuthenticators(_authenticators);
        _addExecutionStrategies(_executionStrategies);

        nextProposalId = 1;

        emit SpaceCreated(
            address(this),
            _controller,
            _votingDelay,
            _minVotingDuration,
            _maxVotingDuration,
            _proposalThreshold,
            _metadataUri,
            _votingStrategies,
            _votingStrategyMetadata,
            _authenticators,
            _executionStrategies
        );
    }

    // ------------------------------------
    // |                                  |
    // |            INTERNAL              |
    // |                                  |
    // ------------------------------------

    /**
     * @notice Only the space controller can authorize an upgrade to this contract.
     * @param newImplementation The address of the new implementation.
     */
    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _setMaxVotingDuration(uint32 _maxVotingDuration) internal {
        if (_maxVotingDuration < minVotingDuration) revert InvalidDuration(minVotingDuration, _maxVotingDuration);
        maxVotingDuration = _maxVotingDuration;
    }

    function _setMinVotingDuration(uint32 _minVotingDuration) internal {
        if (_minVotingDuration > maxVotingDuration) revert InvalidDuration(_minVotingDuration, maxVotingDuration);
        minVotingDuration = _minVotingDuration;
    }

    function _setProposalThreshold(uint256 _proposalThreshold) internal {
        proposalThreshold = _proposalThreshold;
    }

    function _setVotingDelay(uint32 _votingDelay) internal {
        votingDelay = _votingDelay;
    }

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
            if (_votingStrategies[i].addy == address(0)) revert InvalidStrategyAddress();
            votingStrategies.push(_votingStrategies[i]);
        }
    }

    /**
     * @notice  Internal function to remove voting strategies.
     * @dev     Does not shrink the array but simply sets the values to 0.
     * @param   _votingStrategyIndices  Indices of the strategies to remove.
     */
    function _removeVotingStrategies(uint8[] memory _votingStrategyIndices) internal {
        if (_votingStrategyIndices.length == 0) revert EmptyArray();
        for (uint8 i = 0; i < _votingStrategyIndices.length; i++) {
            votingStrategies[_votingStrategyIndices[i]].addy = address(0);
            votingStrategies[_votingStrategyIndices[i]].params = new bytes(0);
        }

        // TODO: should we check that there are still voting strategies left after this?
    }

    /**
     * @notice  Internal function to add authenticators.
     * @param   _authenticators  Array of authenticators to add.
     */
    function _addAuthenticators(address[] memory _authenticators) internal {
        if (_authenticators.length == 0) revert EmptyArray();
        for (uint256 i = 0; i < _authenticators.length; i++) {
            authenticators[_authenticators[i]] = true;
        }
    }

    /**
     * @notice  Internal function to remove authenticators.
     * @param   _authenticators  Array of authenticators to remove.
     */
    function _removeAuthenticators(address[] memory _authenticators) internal {
        if (_authenticators.length == 0) revert EmptyArray();
        for (uint256 i = 0; i < _authenticators.length; i++) {
            authenticators[_authenticators[i]] = false;
        }
        // TODO: should we check that there are still authenticators left? same for other setters..
    }

    /**
     * @notice  Internal function to add execution strategies.
     * @param   _executionStrategies  Array of execution strategies to add.
     */
    function _addExecutionStrategies(Strategy[] memory _executionStrategies) internal {
        if (_executionStrategies.length == 0) revert EmptyArray();
        for (uint256 i = 0; i < _executionStrategies.length; i++) {
            // A strategy set to 0 is used to indicate that the strategy is no longer active,
            // so we need to prevent the user from adding a null invalid strategy address.
            if (_executionStrategies[i].addy == address(0)) revert InvalidStrategyAddress();
            executionStrategies.push(_executionStrategies[i]);
        }
    }

    /**
     * @notice  Internal function to remove execution strategies.
     * @param   _executionStrategyIndices  Indices of the strategies to remove
     */
    function _removeExecutionStrategies(uint8[] memory _executionStrategyIndices) internal {
        if (_executionStrategyIndices.length == 0) revert EmptyArray();
        for (uint8 i = 0; i < _executionStrategyIndices.length; i++) {
            executionStrategies[_executionStrategyIndices[i]] = Strategy(address(0), new bytes(0));
        }
    }

    /**
     * @notice  Internal function to ensure `msg.sender` is in the list of allowed authenticators.
     */
    function _assertValidAuthenticator() internal view {
        if (authenticators[msg.sender] != true) revert AuthenticatorNotWhitelisted(msg.sender);
    }

    /**
     * @notice  Internal function to ensure `executionStrategy` is in the array of whitelisted execution strategies.
     * @param   executionStrategyIndex The execution strategy to check.
     */
    function _assertValidExecutionStrategy(uint8 executionStrategyIndex) internal view {
        if (executionStrategyIndex >= executionStrategies.length)
            revert InvalidExecutionStrategyIndex(executionStrategyIndex);
        if (executionStrategies[executionStrategyIndex].addy == address(0)) revert ExecutionStrategyNotWhitelisted();
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
     * @dev     We create a bitmap of those indices by using a `u256`. We try to set the bit at index `i`, stopping it
     * @dev     it has already been set. Time complexity is O(n).
     * @param   strats  Array to check for duplicates.
     */
    function _assertNoDuplicateIndices(IndexedStrategy[] memory strats) internal pure {
        if (strats.length < 2) {
            return;
        }

        uint256 bitMap;
        for (uint256 i = 0; i < strats.length; ++i) {
            // Check that bit at index `strats[i].index` is not set
            uint256 s = 1 << strats[i].index;
            if (bitMap & s != 0) revert DuplicateFound(strats[i].index);
            // Update aforementioned bit.
            bitMap |= s;
        }
    }

    /**
     * @notice  Internal function that will loop over the used voting strategies and
                return the cumulative voting power of a user when creating a proposal.
     * @dev     
     * @param   timestamp  Timestamp of the snapshot.
     * @param   userAddress  Address for which to compute the voting power.
     * @param   userVotingStrategies The desired voting strategies to check.
     * @return  uint256  The total voting power of a user (over those specified voting strategies).
     */
    function _getCumulativeProposingPower(
        uint32 timestamp,
        address userAddress,
        IndexedStrategy[] calldata userVotingStrategies
    ) internal returns (uint256) {
        // Ensure there are no duplicates to avoid an attack where people double count a voting strategy
        _assertNoDuplicateIndices(userVotingStrategies);

        uint256 totalVotingPower = 0;
        for (uint256 i = 0; i < userVotingStrategies.length; i++) {
            uint256 votingStrategyIndex = userVotingStrategies[i].index;
            if (votingStrategyIndex >= votingStrategies.length) revert InvalidVotingStrategyIndex(votingStrategyIndex);
            Strategy memory votingStrategy = votingStrategies[votingStrategyIndex];
            // A strategyAddress set to 0 indicates that this address has already been removed and is
            // no longer a valid voting strategy. See `_removeVotingStrategies`.
            if (votingStrategy.addy == address(0)) revert InvalidVotingStrategyIndex(votingStrategyIndex);
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
     * @notice  Internal function that will loop over the used voting strategies and
                return the cumulative voting power of a user when voting. 
     * @dev     
     * @param   timestamp  Timestamp of the snapshot.
     * @param   userAddress  Address for which to compute the voting power.
     * @param   userVotingStrategies The desired voting strategies to check.
     * @param   _votingStrategies The array of voting strategies that are used for this proposal.
                We cannot use the `votingStrategies` state variable because it might have updated 
                since the proposal was created.
     * @return  uint256  The total voting power of a user (over those specified voting strategies).
     */
    function _getCumulativeVotingPower(
        uint32 timestamp,
        address userAddress,
        IndexedStrategy[] calldata userVotingStrategies,
        Strategy[] memory _votingStrategies
    ) internal returns (uint256) {
        // Ensure there are no duplicates to avoid an attack where people double count a voting strategy
        _assertNoDuplicateIndices(userVotingStrategies);

        uint256 totalVotingPower = 0;
        for (uint256 i = 0; i < userVotingStrategies.length; i++) {
            uint256 votingStrategyIndex = userVotingStrategies[i].index;
            if (votingStrategyIndex >= _votingStrategies.length) revert InvalidVotingStrategyIndex(votingStrategyIndex);
            Strategy memory votingStrategy = _votingStrategies[votingStrategyIndex];
            // A strategyAddress set to 0 indicates that this address has already been removed and is
            // no longer a valid voting strategy. See `_removeVotingStrategies`.
            if (votingStrategy.addy == address(0)) revert InvalidVotingStrategyIndex(votingStrategyIndex);
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

    // ------------------------------------
    // |                                  |
    // |             SETTERS              |
    // |                                  |
    // ------------------------------------

    function setController(address _controller) external override onlyOwner {
        transferOwnership(_controller);
        emit ControllerUpdated(_controller);
    }

    function setMaxVotingDuration(uint32 _maxVotingDuration) external override onlyOwner {
        _setMaxVotingDuration(_maxVotingDuration);
        emit MaxVotingDurationUpdated(_maxVotingDuration);
    }

    function setMinVotingDuration(uint32 _minVotingDuration) external override onlyOwner {
        _setMinVotingDuration(_minVotingDuration);
        emit MinVotingDurationUpdated(_minVotingDuration);
    }

    function setMetadataUri(string calldata _metadataUri) external override onlyOwner {
        emit MetadataUriUpdated(_metadataUri);
    }

    function setProposalThreshold(uint256 _proposalThreshold) external override onlyOwner {
        _setProposalThreshold(_proposalThreshold);
        emit ProposalThresholdUpdated(_proposalThreshold);
    }

    function setVotingDelay(uint32 _votingDelay) external override onlyOwner {
        _setVotingDelay(_votingDelay);
        emit VotingDelayUpdated(_votingDelay);
    }

    function addVotingStrategies(
        Strategy[] calldata _votingStrategies,
        bytes[] calldata votingStrategyMetadata
    ) external override onlyOwner {
        _addVotingStrategies(_votingStrategies);
        emit VotingStrategiesAdded(_votingStrategies, votingStrategyMetadata);
    }

    function removeVotingStrategies(uint8[] calldata _votingStrategyIndices) external override onlyOwner {
        _removeVotingStrategies(_votingStrategyIndices);
        emit VotingStrategiesRemoved(_votingStrategyIndices);
    }

    function addAuthenticators(address[] calldata _authenticators) external override onlyOwner {
        _addAuthenticators(_authenticators);
        emit AuthenticatorsAdded(_authenticators);
    }

    function removeAuthenticators(address[] calldata _authenticators) external override onlyOwner {
        _removeAuthenticators(_authenticators);
        emit AuthenticatorsRemoved(_authenticators);
    }

    function addExecutionStrategies(Strategy[] calldata _executionStrategies) external override onlyOwner {
        _addExecutionStrategies(_executionStrategies);
        emit ExecutionStrategiesAdded(_executionStrategies);
    }

    function removeExecutionStrategies(uint8[] calldata _executionStrategies) external override onlyOwner {
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
        return proposalRegistry[proposalId];
    }

    function getProposalStatus(uint256 proposalId) public view override returns (ProposalStatus) {
        Proposal memory proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);
        return
            IExecutionStrategy(proposal.executionStrategy.addy).getProposalStatus(
                proposal,
                votePower[proposalId][Choice.For],
                votePower[proposalId][Choice.Against],
                votePower[proposalId][Choice.Abstain]
            );
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
     * @param   author  The address of the proposal creator.
     * @param   metadataUri  The metadata URI for the proposal.
     * @param   executionStrategy  The execution strategy index and associated execution payload to use in the proposal.
     * @param   userVotingStrategies  The voting strategies indexes to use and the associated parameters for each.
     */
    function propose(
        address author,
        string calldata metadataUri,
        IndexedStrategy calldata executionStrategy,
        IndexedStrategy[] calldata userVotingStrategies
    ) external override {
        _assertValidAuthenticator();
        _assertValidExecutionStrategy(executionStrategy.index);

        // Casting to `uint32` is fine because this gives us until year ~2106.
        uint32 snapshotTimestamp = uint32(block.timestamp);

        uint256 votingPower = _getCumulativeProposingPower(snapshotTimestamp, author, userVotingStrategies);
        if (votingPower < proposalThreshold) revert ProposalThresholdNotReached(votingPower);

        uint32 startTimestamp = snapshotTimestamp + votingDelay;
        uint32 minEndTimestamp = startTimestamp + minVotingDuration;
        uint32 maxEndTimestamp = startTimestamp + maxVotingDuration;

        // The execution payload is the params of the supplied execution strategy struct.
        bytes32 executionPayloadHash = keccak256(executionStrategy.params);

        Proposal memory proposal = Proposal(
            snapshotTimestamp,
            startTimestamp,
            minEndTimestamp,
            maxEndTimestamp,
            executionPayloadHash,
            executionStrategies[executionStrategy.index],
            author,
            FinalizationStatus.Pending,
            votingStrategies
        );

        proposalRegistry[nextProposalId] = proposal;
        emit ProposalCreated(nextProposalId, author, proposal, metadataUri, executionStrategy.params);

        nextProposalId++;
    }

    /**
     * @notice  Cast a vote
     * @param   voterAddress  Voter's address.
     * @param   proposalId  Proposal id.
     * @param   choice  Choice can be `For`, `Against` or `Abstain`.
     * @param   userVotingStrategies  Strategies to use to compute the voter's voting power.
     * @param   voteMetadataUri  An optional metadata to give information about the vote.
     */
    function vote(
        address voterAddress,
        uint256 proposalId,
        Choice choice,
        IndexedStrategy[] calldata userVotingStrategies,
        string calldata voteMetadataUri
    ) external override {
        _assertValidAuthenticator();

        Proposal memory proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        uint32 currentTimestamp = uint32(block.timestamp);
        if (currentTimestamp >= proposal.maxEndTimestamp) revert VotingPeriodHasEnded();
        if (currentTimestamp < proposal.startTimestamp) revert VotingPeriodHasNotStarted();
        if (proposal.finalizationStatus != FinalizationStatus.Pending) revert ProposalFinalized();
        if (voteRegistry[proposalId][voterAddress] == true) revert UserHasAlreadyVoted();

        uint256 votingPower = _getCumulativeVotingPower(
            proposal.snapshotTimestamp,
            voterAddress,
            userVotingStrategies,
            proposal.votingStrategies
        );

        if (votingPower == 0) revert UserHasNoVotingPower();
        uint256 previousVotingPower = votePower[proposalId][choice];
        uint256 newVotingPower = previousVotingPower + votingPower;
        votePower[proposalId][choice] = newVotingPower;

        voteRegistry[proposalId][voterAddress] = true;

        emit VoteCreated(proposalId, voterAddress, Vote(choice, votingPower), voteMetadataUri);
    }

    /**
     * @notice  Executes a proposal if it is in the `Accepted` or `VotingPeriodAccepted` state.
     * @param   proposalId  The proposal id.
     * @param   executionPayload  The execution payload, as described in `propose()`.
     */
    function execute(uint256 proposalId, bytes calldata executionPayload) external nonReentrant {
        Proposal storage proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        // We add reentrancy protection here to prevent this function being re-entered by the execution strategy.
        // We cannot use the Checks-Effects-Interactions pattern because the proposal status is checked inside
        // the execution strategy (so essentially forced to do Checks-Interactions-Effects).
        IExecutionStrategy(proposal.executionStrategy.addy).execute(
            proposal,
            votePower[proposalId][Choice.For],
            votePower[proposalId][Choice.Against],
            votePower[proposalId][Choice.Abstain],
            executionPayload
        );

        proposal.finalizationStatus = FinalizationStatus.Executed;

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice  Cancel a proposal. Only callable by the space controller.
     * @param   proposalId  The proposal to cancel
     */
    function cancel(uint256 proposalId) external override onlyOwner {
        Proposal storage proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);
        if (proposal.finalizationStatus != FinalizationStatus.Pending) revert ProposalFinalized();
        proposal.finalizationStatus = FinalizationStatus.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    /**
     * @notice  Updates the proposal executionStrategy and metadata. Will only work if voting has 
                not started yet, i.e `voting_delay` has not elapsed yet.
     * @param   proposalId          The id of the proposal to edit
     * @param   executionStrategy   The new strategy to use
     * @param   metadataUri         The new metadata
     */
    function updateProposal(
        address author,
        uint256 proposalId,
        IndexedStrategy calldata executionStrategy,
        string calldata metadataUri
    ) external {
        _assertValidAuthenticator();
        _assertValidExecutionStrategy(executionStrategy.index);

        Proposal storage proposal = proposalRegistry[proposalId];
        if (author != proposal.author) revert InvalidCaller();
        if (block.timestamp >= proposal.startTimestamp) revert VotingDelayHasPassed();

        proposal.executionPayloadHash = keccak256(executionStrategy.params);
        proposal.executionStrategy = executionStrategies[executionStrategy.index];

        emit ProposalUpdated(proposalId, executionStrategy, metadataUri);
    }
}

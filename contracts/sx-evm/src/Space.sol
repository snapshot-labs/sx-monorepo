// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;
import "forge-std/console2.sol";
import "src/interfaces/IVotingStrategy.sol";
// import "src/interfaces/ISpace.sol"; TODO: add this later when everything has been impl
import "src/interfaces/space/ISpaceEvents.sol";
import "src/SpaceErrors.sol";
import "src/types.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@zodiac/core/Module.sol";

/**
 * @author  SnapshotLabs
 * @title   Space Contract.
 * @notice  Logic and bookkeeping contract.
 */
contract Space is ISpaceEvents, Module, SpaceErrors {
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

    // ------------------------------------
    // |                                  |
    // |          CONSTRUCTOR             |
    // |                                  |
    // ------------------------------------

    constructor(
        address _owner,
        uint32 _votingDelay,
        uint32 _minVotingDuration,
        uint32 _maxVotingDuration,
        uint256 _proposalThreshold,
        uint256 _quorum,
        Strategy[] memory _votingStrategies,
        address[] memory _authenticators,
        address[] memory _executionStrategies
    ) {
        bytes memory initParams = abi.encode(
            _owner,
            _votingDelay,
            _minVotingDuration,
            _maxVotingDuration,
            _proposalThreshold,
            _quorum,
            _votingStrategies,
            _authenticators,
            _executionStrategies
        );
        setUp(initParams);
    }

    function setUp(bytes memory initializeParams) public override initializer {
        __Ownable_init();
        (
            address _owner,
            uint32 _votingDelay,
            uint32 _minVotingDuration,
            uint32 _maxVotingDuration,
            uint256 _proposalThreshold,
            uint256 _quorum,
            Strategy[] memory _votingStrategies,
            address[] memory _authenticators,
            address[] memory _executionStrategies
        ) = abi.decode(
                initializeParams,
                (address, uint32, uint32, uint32, uint256, uint256, Strategy[], address[], address[])
            );

        if (_minVotingDuration > _maxVotingDuration) revert InvalidDuration(_minVotingDuration, _maxVotingDuration);
        if (_authenticators.length == 0) revert EmptyArray();
        if (_executionStrategies.length == 0) revert EmptyArray();

        // TODO: call _addVotingStrategies and remove
        if (_votingStrategies.length == 0) revert EmptyArray();

        transferOwnership(_owner);

        votingDelay = _votingDelay;
        minVotingDuration = _minVotingDuration;
        maxVotingDuration = _maxVotingDuration;
        proposalThreshold = _proposalThreshold;
        quorum = _quorum;

        _addVotingStrategies(_votingStrategies);
        _addAuthenticators(_authenticators);
        _addExecutionStrategies(_executionStrategies);

        // TODO: decide if we wish to emit the events or not
        // emit VotingStrategiesAdded(_votingStrategies, _votingStrategiesParams);
        // emit ExecutionStrategiesAdded(_executionStrategies);
        // emit AuthenticatorsAdded(_authenticators);

        nextProposalId = 1;
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

        emit VotingStrategiesAdded(_votingStrategies);
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

        emit VotingStrategiesRemoved(indicesToRemove);
    }

    /**
     * @notice  Internal function to add authenticators.
     * @param   _authenticators  Array of authenticators to add.
     */
    function _addAuthenticators(address[] memory _authenticators) internal {
        for (uint256 i = 0; i < _authenticators.length; i++) {
            authenticators[_authenticators[i]] = true;
        }
        emit AuthenticatorsAdded(_authenticators);
    }

    /**
     * @notice  Internal function to remove authenticators.
     * @param   _authenticators  Array of authenticators to remove.
     */
    function _removeAuthenticators(address[] memory _authenticators) internal {
        for (uint256 i = 0; i < _authenticators.length; i++) {
            authenticators[_authenticators[i]] = false;
        }
        emit AuthenticatorsRemoved(_authenticators);
    }

    /**
     * @notice  Internal function to add exection strategies.
     * @param   _executionStrategies  Array of exectuion strategies to add.
     */
    function _addExecutionStrategies(address[] memory _executionStrategies) internal {
        for (uint256 i = 0; i < _executionStrategies.length; i++) {
            executionStrategies[_executionStrategies[i]] = true;
        }
        emit ExecutionStrategiesAdded(_executionStrategies);
    }

    /**
     * @notice  Internal function to remove execution strategies.
     * @param   _executionStrategies  Array of execution strategies to remove.
     */
    function _removeExecutionStrategies(address[] memory _executionStrategies) internal {
        for (uint256 i = 0; i < _executionStrategies.length; i++) {
            executionStrategies[_executionStrategies[i]] = false;
        }
        emit ExecutionStrategiesRemoved(_executionStrategies);
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
    function _assertProposalExists(Proposal memory proposal) internal view {
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
            totalVotingPower += strategy.getVotingPower(
                timestamp,
                userAddress,
                votingStrategy.params,
                userVotingStrategies[i].params
            );
            // TODO: use SafeMath, check overflow
        }

        return totalVotingPower;
    }

    // TODO: fix this function once we have `vote`
    /**
     * @notice  Returns whether the quorum has been reached for this particular proposal or not.
     * @param   proposalId  The proposal ID.
     * @return  bool  Whether or not the quorum has been reached.
     */
    function _quorumReached(uint256 proposalId) internal view returns (bool) {
        return (true);
    }

    // ------------------------------------
    // |                                  |
    // |             SETTERS              |
    // |                                  |
    // ------------------------------------

    function setMaxVotingDuration(uint32 _maxVotingDuration) external onlyOwner {
        if (_maxVotingDuration < minVotingDuration) revert InvalidDuration(minVotingDuration, _maxVotingDuration);
        emit MaxVotingDurationUpdated(maxVotingDuration, _maxVotingDuration);

        maxVotingDuration = _maxVotingDuration;
    }

    function setMinVotingDuration(uint32 _minVotingDuration) external onlyOwner {
        if (_minVotingDuration > maxVotingDuration) revert InvalidDuration(_minVotingDuration, maxVotingDuration);

        emit MinVotingDurationUpdated(minVotingDuration, _minVotingDuration);

        minVotingDuration = _minVotingDuration;
    }

    function setMetadataUri(string calldata _metadataUri) external onlyOwner {
        emit MetadataUriUpdated(_metadataUri);
    }

    function setProposalThreshold(uint256 _threshold) external onlyOwner {
        emit ProposalThresholdUpdated(proposalThreshold, _threshold);

        proposalThreshold = _threshold;
    }

    function setQuorum(uint256 _quorum) external onlyOwner {
        emit QuorumUpdated(quorum, _quorum);
        quorum = _quorum;
    }

    function setVotingDelay(uint32 _votingDelay) external onlyOwner {
        emit VotingDelayUpdated(votingDelay, _votingDelay);

        votingDelay = _votingDelay;
        // TODO: check it's not too big?
    }

    function addVotingStrategies(Strategy[] calldata _votingStrategies) external onlyOwner {
        _addVotingStrategies(_votingStrategies);
    }

    function removeVotingStrategies(uint8[] calldata indicesToRemove) external onlyOwner {
        _removeVotingStrategies(indicesToRemove);
    }

    function addAuthenticators(address[] calldata _authenticators) external onlyOwner {
        _addAuthenticators(_authenticators);
    }

    function removeAuthenticators(address[] calldata _authenticators) external onlyOwner {
        _removeAuthenticators(_authenticators);
    }

    function addExecutionStrategies(address[] calldata _executionStrategies) external onlyOwner {
        _addExecutionStrategies(_executionStrategies);
    }

    function removeExecutionStrategies(address[] calldata _executionStrategies) external onlyOwner {
        _removeExecutionStrategies(_executionStrategies);
    }

    // ------------------------------------
    // |                                  |
    // |             GETTERS              |
    // |                                  |
    // ------------------------------------

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        Proposal memory proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

        return (proposal);
    }

    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus) {
        Proposal memory proposal = proposalRegistry[proposalId];
        _assertProposalExists(proposal);

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
                    if (_quorumReached(proposalId)) {
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

    // ------------------------------------
    // |                                  |
    // |             CORE                 |
    // |                                  |
    // ------------------------------------

    /**
     * @notice  Creates a proposal.
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
    ) external {
        _assertValidAuthenticator();
        console2.log(executionStrategy.addy);
        // console2.log(executionStrategy.params);
        _assertValidExecutionStrategy(executionStrategy.addy);

        // Casting to `uint32` is fine because this gives us until year ~2106.
        uint32 snapshotTimestamp = uint32(block.timestamp);

        uint256 votingPower = _getCumulativeVotingPower(snapshotTimestamp, proposerAddress, userVotingStrategies);
        if (votingPower < proposalThreshold) revert ProposalThresholdNotReached(votingPower);

        // TODO: use SafeMath
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
}

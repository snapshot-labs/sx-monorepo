// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { IERC4824 } from "src/interfaces/IERC4824.sol";
import { ISpace, ISpaceActions, ISpaceState, ISpaceOwnerActions } from "src/interfaces/ISpace.sol";
import {
    Choice,
    FinalizationStatus,
    IndexedStrategy,
    Proposal,
    ProposalStatus,
    Strategy,
    UpdateSettingsCalldata,
    InitializeCalldata
} from "src/types.sol";
import { IVotingStrategy } from "src/interfaces/IVotingStrategy.sol";
import { IExecutionStrategy } from "src/interfaces/IExecutionStrategy.sol";
import { IProposalValidationStrategy } from "src/interfaces/IProposalValidationStrategy.sol";
import { SXUtils } from "./utils/SXUtils.sol";
import { BitPacker } from "./utils/BitPacker.sol";

/// @title Space Contract
/// @notice The core contract for Snapshot X.
///         A proxy of this contract should be deployed with the Proxy Factory.
contract Space is ISpace, Initializable, IERC4824, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuard {
    using BitPacker for uint256;
    using SXUtils for IndexedStrategy[];

    /// @dev Placeholder value to indicate the user does not want to update a string.
    /// @dev Evaluates to: `0xf2cda9b13ed04e585461605c0d6e804933ca828111bd94d4e6a96c75e8b048ba`.
    bytes32 private constant NO_UPDATE_HASH = keccak256(abi.encodePacked("No update"));

    /// @dev Placeholder value to indicate the user does not want to update an address.
    /// @dev Evaluates to: `0xf2cda9b13ed04e585461605c0d6e804933ca8281`.
    address private constant NO_UPDATE_ADDRESS = address(bytes20(keccak256(abi.encodePacked("No update"))));

    /// @dev Placeholder value to indicate the user does not want to update a uint32.
    /// @dev Evaluates to: `0xf2cda9b1`.
    uint32 private constant NO_UPDATE_UINT32 = uint32(bytes4(keccak256(abi.encodePacked("No update"))));

    /// @inheritdoc IERC4824
    string public daoURI;
    /// @inheritdoc ISpaceState
    uint32 public override maxVotingDuration;
    /// @inheritdoc ISpaceState
    uint32 public override minVotingDuration;
    /// @inheritdoc ISpaceState
    uint256 public override nextProposalId;
    /// @inheritdoc ISpaceState
    uint32 public override votingDelay;
    /// @inheritdoc ISpaceState
    uint256 public override activeVotingStrategies;
    /// @inheritdoc ISpaceState
    mapping(uint8 strategyIndex => Strategy strategy) public override votingStrategies;
    /// @inheritdoc ISpaceState
    uint8 public override nextVotingStrategyIndex;
    /// @inheritdoc ISpaceState
    Strategy public override proposalValidationStrategy;
    /// @inheritdoc ISpaceState
    mapping(address auth => bool allowed) public override authenticators;
    /// @inheritdoc ISpaceState
    mapping(uint256 proposalId => Proposal proposal) public override proposals;
    // @inheritdoc ISpaceState
    mapping(uint256 proposalId => mapping(Choice choice => uint256 votePower)) public override votePower;
    /// @inheritdoc ISpaceState
    mapping(uint256 proposalId => mapping(address voter => bool hasVoted)) public override voteRegistry;

    /// @inheritdoc ISpaceActions
    function initialize(InitializeCalldata calldata input) external override initializer {
        if (input.votingStrategies.length == 0) revert EmptyArray();
        if (input.authenticators.length == 0) revert EmptyArray();
        if (input.votingStrategies.length != input.votingStrategyMetadataURIs.length) revert ArrayLengthMismatch();

        __Ownable_init();
        transferOwnership(input.owner);
        _setDaoURI(input.daoURI);
        _setMaxVotingDuration(input.maxVotingDuration);
        _setMinVotingDuration(input.minVotingDuration);
        _setProposalValidationStrategy(input.proposalValidationStrategy);
        _setVotingDelay(input.votingDelay);
        _addVotingStrategies(input.votingStrategies);
        _addAuthenticators(input.authenticators);

        nextProposalId = 1;

        emit SpaceCreated(address(this), input);
    }

    // ------------------------------------
    // |                                  |
    // |             SETTERS              |
    // |                                  |
    // ------------------------------------

    /// @inheritdoc ISpaceOwnerActions
    // solhint-disable-next-line code-complexity
    function updateSettings(UpdateSettingsCalldata calldata input) external override onlyOwner {
        if ((input.minVotingDuration != NO_UPDATE_UINT32) && (input.maxVotingDuration != NO_UPDATE_UINT32)) {
            // Check that min and max VotingDuration are valid
            // We don't use the internal `_setMinVotingDuration` and `_setMaxVotingDuration` functions because
            // it would revert when `_minVotingDuration > maxVotingDuration` (when the new `_min` is
            // bigger than the current `max`).
            if (input.minVotingDuration > input.maxVotingDuration)
                revert InvalidDuration(input.minVotingDuration, input.maxVotingDuration);

            minVotingDuration = input.minVotingDuration;
            emit MinVotingDurationUpdated(input.minVotingDuration);

            maxVotingDuration = input.maxVotingDuration;
            emit MaxVotingDurationUpdated(input.maxVotingDuration);
        } else if (input.minVotingDuration != NO_UPDATE_UINT32) {
            _setMinVotingDuration(input.minVotingDuration);
            emit MinVotingDurationUpdated(input.minVotingDuration);
        } else if (input.maxVotingDuration != NO_UPDATE_UINT32) {
            _setMaxVotingDuration(input.maxVotingDuration);
            emit MaxVotingDurationUpdated(input.maxVotingDuration);
        }

        if (input.votingDelay != NO_UPDATE_UINT32) {
            _setVotingDelay(input.votingDelay);
            emit VotingDelayUpdated(input.votingDelay);
        }

        if (keccak256(abi.encodePacked(input.metadataURI)) != NO_UPDATE_HASH) {
            emit MetadataURIUpdated(input.metadataURI);
        }

        if (keccak256(abi.encodePacked(input.daoURI)) != NO_UPDATE_HASH) {
            _setDaoURI(input.daoURI);
            emit DaoURIUpdated(input.daoURI);
        }

        if (input.proposalValidationStrategy.addr != NO_UPDATE_ADDRESS) {
            _setProposalValidationStrategy(input.proposalValidationStrategy);
            emit ProposalValidationStrategyUpdated(
                input.proposalValidationStrategy,
                input.proposalValidationStrategyMetadataURI
            );
        }

        if (input.authenticatorsToAdd.length > 0) {
            _addAuthenticators(input.authenticatorsToAdd);
            emit AuthenticatorsAdded(input.authenticatorsToAdd);
        }

        if (input.authenticatorsToRemove.length > 0) {
            _removeAuthenticators(input.authenticatorsToRemove);
            emit AuthenticatorsRemoved(input.authenticatorsToRemove);
        }

        if (input.votingStrategiesToAdd.length > 0) {
            if (input.votingStrategiesToAdd.length != input.votingStrategyMetadataURIsToAdd.length)
                revert ArrayLengthMismatch();
            _addVotingStrategies(input.votingStrategiesToAdd);
            emit VotingStrategiesAdded(input.votingStrategiesToAdd, input.votingStrategyMetadataURIsToAdd);
        }

        if (input.votingStrategiesToRemove.length > 0) {
            _removeVotingStrategies(input.votingStrategiesToRemove);
            emit VotingStrategiesRemoved(input.votingStrategiesToRemove);
        }
    }

    /// @dev Gates access to whitelisted authenticators only.
    modifier onlyAuthenticator() {
        if (authenticators[msg.sender] != true) revert AuthenticatorNotWhitelisted();
        _;
    }

    // ------------------------------------
    // |                                  |
    // |             GETTERS              |
    // |                                  |
    // ------------------------------------

    /// @inheritdoc ISpaceState
    function getProposalStatus(uint256 proposalId) external view override returns (ProposalStatus) {
        Proposal memory proposal = proposals[proposalId];
        _assertProposalExists(proposal);
        return
            proposal.executionStrategy.getProposalStatus(
                proposal,
                votePower[proposalId][Choice.For],
                votePower[proposalId][Choice.Against],
                votePower[proposalId][Choice.Abstain]
            );
    }

    // ------------------------------------
    // |                                  |
    // |             CORE                 |
    // |                                  |
    // ------------------------------------

    /// @inheritdoc ISpaceActions
    function propose(
        address author,
        string calldata metadataURI,
        Strategy calldata executionStrategy,
        bytes calldata userProposalValidationParams
    ) external override onlyAuthenticator {
        // Casting to `uint32` is fine because this gives us until year ~2106.
        uint32 snapshotTimestamp = uint32(block.timestamp);

        if (
            !IProposalValidationStrategy(proposalValidationStrategy.addr).validate(
                author,
                proposalValidationStrategy.params,
                userProposalValidationParams
            )
        ) revert FailedToPassProposalValidation();

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
            IExecutionStrategy(executionStrategy.addr),
            author,
            FinalizationStatus.Pending,
            activeVotingStrategies
        );

        proposals[nextProposalId] = proposal;
        emit ProposalCreated(nextProposalId, author, proposal, metadataURI, executionStrategy.params);

        nextProposalId++;
    }

    /// @inheritdoc ISpaceActions
    function vote(
        address voter,
        uint256 proposalId,
        Choice choice,
        IndexedStrategy[] calldata userVotingStrategies,
        string calldata metadataURI
    ) external override onlyAuthenticator {
        Proposal memory proposal = proposals[proposalId];
        _assertProposalExists(proposal);
        if (block.timestamp >= proposal.maxEndTimestamp) revert VotingPeriodHasEnded();
        if (block.timestamp < proposal.startTimestamp) revert VotingPeriodHasNotStarted();
        if (proposal.finalizationStatus != FinalizationStatus.Pending) revert ProposalFinalized();
        if (voteRegistry[proposalId][voter]) revert UserAlreadyVoted();

        uint256 votingPower = _getCumulativePower(
            voter,
            proposal.snapshotTimestamp,
            userVotingStrategies,
            proposal.activeVotingStrategies
        );
        if (votingPower == 0) revert UserHasNoVotingPower();
        votePower[proposalId][choice] += votingPower;
        voteRegistry[proposalId][voter] = true;

        if (bytes(metadataURI).length == 0) {
            emit VoteCast(proposalId, voter, choice, votingPower);
        } else {
            emit VoteCastWithMetadata(proposalId, voter, choice, votingPower, metadataURI);
        }
    }

    /// @inheritdoc ISpaceActions
    function execute(uint256 proposalId, bytes calldata executionPayload) external override nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        _assertProposalExists(proposal);

        // We add reentrancy protection here to prevent this function being re-entered by the execution strategy.
        // We cannot use the Checks-Effects-Interactions pattern because the proposal status is checked inside
        // the execution strategy (so essentially forced to do Checks-Interactions-Effects).
        proposal.executionStrategy.execute(
            proposal,
            votePower[proposalId][Choice.For],
            votePower[proposalId][Choice.Against],
            votePower[proposalId][Choice.Abstain],
            executionPayload
        );

        proposal.finalizationStatus = FinalizationStatus.Executed;

        emit ProposalExecuted(proposalId);
    }

    /// @inheritdoc ISpaceOwnerActions
    function cancel(uint256 proposalId) external override onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        _assertProposalExists(proposal);
        if (proposal.finalizationStatus != FinalizationStatus.Pending) revert ProposalFinalized();
        proposal.finalizationStatus = FinalizationStatus.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    /// @inheritdoc ISpaceActions
    function updateProposal(
        address author,
        uint256 proposalId,
        Strategy calldata executionStrategy,
        string calldata metadataURI
    ) external override onlyAuthenticator {
        Proposal storage proposal = proposals[proposalId];
        _assertProposalExists(proposal);
        if (author != proposal.author) revert InvalidCaller();
        if (block.timestamp >= proposal.startTimestamp) revert VotingDelayHasPassed();

        proposal.executionPayloadHash = keccak256(executionStrategy.params);
        proposal.executionStrategy = IExecutionStrategy(executionStrategy.addr);

        emit ProposalUpdated(proposalId, executionStrategy, metadataURI);
    }

    // ------------------------------------
    // |                                  |
    // |            INTERNAL              |
    // |                                  |
    // ------------------------------------

    /// @dev Only the Space owner can authorize an upgrade to this contract.
    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @dev Sets the maximum voting duration.
    function _setMaxVotingDuration(uint32 _maxVotingDuration) internal {
        if (_maxVotingDuration < minVotingDuration) revert InvalidDuration(minVotingDuration, _maxVotingDuration);
        maxVotingDuration = _maxVotingDuration;
    }

    /// @dev Sets the minimum voting duration.
    function _setMinVotingDuration(uint32 _minVotingDuration) internal {
        if (_minVotingDuration > maxVotingDuration) revert InvalidDuration(_minVotingDuration, maxVotingDuration);
        minVotingDuration = _minVotingDuration;
    }

    /// @dev Sets the proposal validation strategy.
    function _setProposalValidationStrategy(Strategy calldata _proposalValidationStrategy) internal {
        proposalValidationStrategy = _proposalValidationStrategy;
    }

    /// @dev Sets the voting delay.
    function _setVotingDelay(uint32 _votingDelay) internal {
        votingDelay = _votingDelay;
    }

    /// @dev Sets the DAO URI.
    function _setDaoURI(string calldata _daoURI) internal {
        daoURI = _daoURI;
    }

    /// @dev Adds an array of voting strategies.
    function _addVotingStrategies(Strategy[] calldata _votingStrategies) internal {
        uint256 cachedActiveVotingStrategies = activeVotingStrategies;
        uint8 cachedNextVotingStrategyIndex = nextVotingStrategyIndex;
        if (cachedNextVotingStrategyIndex >= 256 - _votingStrategies.length) revert ExceedsStrategyLimit();
        for (uint256 i = 0; i < _votingStrategies.length; i++) {
            if (_votingStrategies[i].addr == address(0)) revert ZeroAddress();
            cachedActiveVotingStrategies = cachedActiveVotingStrategies.setBit(cachedNextVotingStrategyIndex, true);
            votingStrategies[cachedNextVotingStrategyIndex] = _votingStrategies[i];
            cachedNextVotingStrategyIndex++;
        }
        activeVotingStrategies = cachedActiveVotingStrategies;
        nextVotingStrategyIndex = cachedNextVotingStrategyIndex;
    }

    /// @dev Removes an array of voting strategies, specified by their indices.
    function _removeVotingStrategies(uint8[] calldata _votingStrategyIndices) internal {
        for (uint8 i = 0; i < _votingStrategyIndices.length; i++) {
            activeVotingStrategies = activeVotingStrategies.setBit(_votingStrategyIndices[i], false);
        }
        // There must always be at least one active voting strategy.
        if (activeVotingStrategies == 0) revert NoActiveVotingStrategies();
    }

    /// @dev Adds an array of authenticators.
    function _addAuthenticators(address[] calldata _authenticators) internal {
        for (uint256 i = 0; i < _authenticators.length; i++) {
            authenticators[_authenticators[i]] = true;
        }
    }

    /// @dev Removes an array of authenticators.
    function _removeAuthenticators(address[] calldata _authenticators) internal {
        for (uint256 i = 0; i < _authenticators.length; i++) {
            authenticators[_authenticators[i]] = false;
        }
        // TODO: should we check that there are still authenticators left? same for other setters..
    }

    /// @dev Reverts if a specified proposal does not exist.
    function _assertProposalExists(Proposal memory proposal) internal pure {
        // startTimestamp cannot be set to 0 when a proposal is created,
        // so if proposal.startTimestamp is 0 it means this proposal does not exist
        // and hence `proposalId` is invalid.
        if (proposal.startTimestamp == 0) revert InvalidProposal();
    }

    /// @dev Returns the cumulative voting power of a user over a set of voting strategies.
    function _getCumulativePower(
        address userAddress,
        uint32 timestamp,
        IndexedStrategy[] calldata userStrategies,
        uint256 allowedStrategies
    ) internal returns (uint256) {
        // Ensure there are no duplicates to avoid an attack where people double count a strategy.
        userStrategies.assertNoDuplicateIndicesCalldata();

        uint256 totalVotingPower;
        for (uint256 i = 0; i < userStrategies.length; ++i) {
            uint8 strategyIndex = userStrategies[i].index;

            // Check that the strategy is allowed for this proposal.
            if (!allowedStrategies.isBitSet(strategyIndex)) {
                revert InvalidStrategyIndex(strategyIndex);
            }

            Strategy memory strategy = votingStrategies[strategyIndex];

            totalVotingPower += IVotingStrategy(strategy.addr).getVotingPower(
                timestamp,
                userAddress,
                strategy.params,
                userStrategies[i].params
            );
        }
        return totalVotingPower;
    }
}

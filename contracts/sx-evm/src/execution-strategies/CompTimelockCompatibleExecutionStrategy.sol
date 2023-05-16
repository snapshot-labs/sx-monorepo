// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { ICompTimelock } from "../interfaces/ICompTimelock.sol";
import { SimpleQuorumExecutionStrategy } from "./SimpleQuorumExecutionStrategy.sol";
import { SpaceManager } from "../utils/SpaceManager.sol";
import { MetaTransaction, Proposal, ProposalStatus } from "../types.sol";
import { Enum } from "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

/// @title Comp Timelock Execution Strategy
/// @notice An Execution strategy that provides compatibility with existing Comp Timelock contracts.
contract CompTimelockCompatibleExecutionStrategy is SimpleQuorumExecutionStrategy {
    /// @notice Thrown if timelock delay is in the future.
    error TimelockDelayNotMet();
    /// @notice Thrown if the proposal execution payload hash is not queued.
    error ProposalNotQueued();
    /// @notice Thrown if the proposal execution payload hash is already queued.
    error DuplicateExecutionPayloadHash();
    /// @notice Thrown if veto caller is not the veto guardian.
    error OnlyVetoGuardian();
    /// @notice Thrown if the transaction is invalid.
    error InvalidTransaction();

    event CompTimelockCompatibleExecutionStrategySetUp(
        address owner,
        address vetoGuardian,
        address[] spaces,
        uint256 quorum,
        address timelock
    );
    event TransactionQueued(MetaTransaction transaction, uint256 executionTime);
    event TransactionExecuted(MetaTransaction transaction);
    event TransactionVetoed(MetaTransaction transaction);
    event VetoGuardianSet(address vetoGuardian, address newVetoGuardian);
    event ProposalVetoed(bytes32 executionPayloadHash);
    event ProposalQueued(bytes32 executionPayloadHash);
    event ProposalExecuted(bytes32 executionPayloadHash);

    /// @notice The time at which a proposal can be executed. Indexed by the hash of the proposal execution payload.
    mapping(bytes32 => uint256) public proposalExecutionTime;

    /// @notice Veto guardian is given permission to veto any queued proposal.
    address public vetoGuardian;

    /// @notice The timelock contract.
    ICompTimelock public timelock;

    /// @notice Constructor
    /// @param _owner Address of the owner of this contract.
    /// @param _vetoGuardian Address of the veto guardian.
    /// @param _spaces Array of whitelisted space contracts.
    /// @param _quorum The quorum required to execute a proposal.
    constructor(address _owner, address _vetoGuardian, address[] memory _spaces, uint256 _quorum, address _timelock) {
        setUp(abi.encode(_owner, _vetoGuardian, _spaces, _quorum, _timelock));
    }

    function setUp(bytes memory initializeParams) public initializer {
        (address _owner, address _vetoGuardian, address[] memory _spaces, uint256 _quorum, address _timelock) = abi
            .decode(initializeParams, (address, address, address[], uint256, address));
        __Ownable_init();
        transferOwnership(_owner);
        vetoGuardian = _vetoGuardian;
        __SpaceManager_init(_spaces);
        __SimpleQuorumExecutionStrategy_init(_quorum);
        timelock = ICompTimelock(_timelock);
        emit CompTimelockCompatibleExecutionStrategySetUp(_owner, _vetoGuardian, _spaces, _quorum, _timelock);
    }

    /// @notice Accepts admin role of the timelock contract. Must be called before using the timelock.
    function acceptAdmin() external {
        timelock.acceptAdmin();
    }

    /// @notice The delay in seconds between a proposal being queued and the execution of the proposal.
    function timelockDelay() public view returns (uint256) {
        return timelock.delay();
    }

    /// @notice Executes a proposal by queueing its transactions in the timelock. Can only be called by approved spaces.
    /// @param proposal The proposal.
    /// @param votesFor The number of votes for the proposal.
    /// @param votesAgainst The number of votes against the proposal.
    /// @param votesAbstain The number of abstaining votes for the proposal.
    /// @param payload The encoded payload of the proposal to execute.
    function execute(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        bytes memory payload
    ) external override onlySpace {
        if (proposal.executionPayloadHash != keccak256(payload)) revert InvalidPayload();

        ProposalStatus proposalStatus = getProposalStatus(proposal, votesFor, votesAgainst, votesAbstain);
        if ((proposalStatus != ProposalStatus.Accepted) && (proposalStatus != ProposalStatus.VotingPeriodAccepted)) {
            revert InvalidProposalStatus(proposalStatus);
        }

        if (proposalExecutionTime[proposal.executionPayloadHash] != 0) revert DuplicateExecutionPayloadHash();

        uint256 executionTime = block.timestamp + timelockDelay();
        proposalExecutionTime[proposal.executionPayloadHash] = executionTime;

        MetaTransaction[] memory transactions = abi.decode(payload, (MetaTransaction[]));
        for (uint256 i = 0; i < transactions.length; i++) {
            // Comp Timelock does not support delegate calls.
            if (transactions[i].operation == Enum.Operation.DelegateCall) {
                revert InvalidTransaction();
            }
            timelock.queueTransaction(
                transactions[i].to,
                transactions[i].value,
                "",
                transactions[i].data,
                executionTime
            );
            emit TransactionQueued(transactions[i], executionTime);
        }
        emit ProposalQueued(proposal.executionPayloadHash);
    }

    /// @notice Executes a queued proposal.
    /// @param payload The encoded payload of the proposal to execute.
    function executeQueuedProposal(bytes memory payload) external {
        bytes32 executionPayloadHash = keccak256(payload);

        uint256 executionTime = proposalExecutionTime[executionPayloadHash];

        if (executionTime == 0) revert ProposalNotQueued();
        if (proposalExecutionTime[executionPayloadHash] > block.timestamp) revert TimelockDelayNotMet();

        // Reset the execution time to 0 to prevent reentrancy.
        proposalExecutionTime[executionPayloadHash] = 0;

        MetaTransaction[] memory transactions = abi.decode(payload, (MetaTransaction[]));
        for (uint256 i = 0; i < transactions.length; i++) {
            timelock.executeTransaction(
                transactions[i].to,
                transactions[i].value,
                "",
                transactions[i].data,
                executionTime
            );
            emit TransactionExecuted(transactions[i]);
        }
        emit ProposalExecuted(executionPayloadHash);
    }

    /// @notice Vetoes a queued proposal.
    /// @param payload The encoded payload of the proposal to veto.
    function veto(bytes memory payload) external {
        bytes32 payloadHash = keccak256(payload);
        if (msg.sender != vetoGuardian) revert OnlyVetoGuardian();

        uint256 executionTime = proposalExecutionTime[payloadHash];
        if (executionTime == 0) revert ProposalNotQueued();

        MetaTransaction[] memory transactions = abi.decode(payload, (MetaTransaction[]));
        for (uint256 i = 0; i < transactions.length; i++) {
            timelock.cancelTransaction(
                transactions[i].to,
                transactions[i].value,
                "",
                transactions[i].data,
                executionTime
            );
            emit TransactionVetoed(transactions[i]);
        }
        proposalExecutionTime[payloadHash] = 0;
        emit ProposalVetoed(payloadHash);
    }

    /// @notice Sets the veto guardian.
    /// @param newVetoGuardian The new veto guardian.
    function setVetoGuardian(address newVetoGuardian) external onlyOwner {
        emit VetoGuardianSet(vetoGuardian, newVetoGuardian);
        vetoGuardian = newVetoGuardian;
    }

    /// @notice Returns the strategy type string.
    function getStrategyType() external pure override returns (string memory) {
        return "CompTimelockCompatibleSimpleQuorum";
    }
}

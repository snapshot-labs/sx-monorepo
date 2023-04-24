// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SimpleQuorumExecutionStrategy } from "./SimpleQuorumExecutionStrategy.sol";
import { SpaceManager } from "../utils/SpaceManager.sol";
import { MetaTransaction, Proposal, ProposalStatus } from "../types.sol";
import { Enum } from "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";

interface ICompTimelock {
    /// @notice Msg.sender accepts admin status.
    function acceptAdmin() external;

    /// @notice Queue a transaction to be executed after a delay.
    /// @param target The address of the contract to call.
    /// @param value The amount of Ether to send.
    /// @param signature The function signature to call.
    /// @param data The calldata to send.
    /// @param eta The timestamp at which to execute the transaction, in seconds.
    /// @return The transaction hash.
    function queueTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) external returns (bytes32);

    /// @notice Execute a queued transaction.
    /// @param target The address of the contract to call.
    /// @param value The amount of Ether to send.
    /// @param signature The function signature to call.
    /// @param data The calldata to send.
    /// @param eta The timestamp at which to execute the transaction, in seconds.
    /// @return The transaction return data.
    function executeTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) external payable returns (bytes memory);

    /// @notice Cancel a queued transaction.
    /// @param target The address of the contract to call.
    /// @param value The amount of Ether to send.
    /// @param signature The function signature to call.
    /// @param data The calldata to send.
    /// @param eta The timestamp at which to execute the transaction, in seconds.
    function cancelTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) external;

    function setDelay(uint delay) external;

    function GRACE_PERIOD() external view returns (uint);

    function MINIMUM_DELAY() external view returns (uint);

    function MAXIMUM_DELAY() external view returns (uint);

    function delay() external view returns (uint);
}

/// @title Timelock Execution Strategy - An Execution strategy that executes transactions according to a timelock delay.
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
    /// @param _spaces Array of whitelisted space contracts.
    /// @param _quorum The quorum required to execute a proposal.
    constructor(address _owner, address[] memory _spaces, uint256 _quorum, address _timelock) {
        setUp(abi.encode(_owner, _spaces, _quorum, _timelock));
    }

    function setUp(bytes memory initializeParams) public initializer {
        (address _owner, address[] memory _spaces, uint256 _quorum, address _timelock) = abi.decode(
            initializeParams,
            (address, address[], uint256, address)
        );
        __Ownable_init();
        transferOwnership(_owner);
        __SpaceManager_init(_spaces);
        __SimpleQuorumExecutionStrategy_init(_quorum);

        timelock = ICompTimelock(_timelock);
    }

    /// @notice Accepts admin role of the timelock contract. Must be called before using the timelock.
    function acceptAdmin() external {
        timelock.acceptAdmin();
    }

    /// @notice The delay in seconds between a proposal being queued and the execution of the proposal.
    function timelockDelay() public view returns (uint256) {
        return timelock.delay();
    }

    /// @notice Effectively a timelock queue function. Can only be called by approved spaces.
    function execute(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        bytes memory payload
    ) external override onlySpace(msg.sender) {
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
            // Comp Timelock does not support delegate calls
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

    /// @notice Executes a queued proposal. Can be called by anyone with the execution payload.
    function executeQueuedProposal(bytes memory payload) external {
        bytes32 executionPayloadHash = keccak256(payload);

        uint256 executionTime = proposalExecutionTime[executionPayloadHash];

        if (executionTime == 0) revert ProposalNotQueued();
        if (proposalExecutionTime[executionPayloadHash] > block.timestamp) revert TimelockDelayNotMet();

        // Reset the execution time to 0 to prevent reentrancy
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

    function setVetoGuardian(address newVetoGuardian) external onlyOwner {
        emit VetoGuardianSet(vetoGuardian, newVetoGuardian);
        vetoGuardian = newVetoGuardian;
    }

    function getStrategyType() external pure override returns (string memory) {
        return "CompTimelockCompatibleSimpleQuorum";
    }
}

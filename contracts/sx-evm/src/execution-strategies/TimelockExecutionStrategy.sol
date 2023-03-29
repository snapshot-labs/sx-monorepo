// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SimpleQuorumExecutionStrategy } from "./SimpleQuorumExecutionStrategy.sol";
import { SpaceManager } from "../utils/SpaceManager.sol";
import { MetaTransaction, Proposal, ProposalStatus } from "../types.sol";
import { Enum } from "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/interfaces/IERC1155Receiver.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";

/// @title Timelock Execution Strategy - An Execution strategy that executes transactions according to a timelock delay.
contract TimelockExecutionStrategy is SimpleQuorumExecutionStrategy, IERC1155Receiver, IERC721Receiver {
    /// @notice Thrown if timelock delay is in the future.
    error TimelockDelayNotMet();
    /// @notice Thrown if the proposal execution payload hash is not queued.
    error ProposalNotQueued();
    /// @notice Thrown if the proposal execution payload hash is already queued.
    error DuplicateExecutionPayloadHash();
    /// @notice Thrown if veto caller is not the veto guardian.
    error OnlyVetoGuardian();

    event TransactionQueued(MetaTransaction transaction, uint256 executionTime);
    event TransactionExecuted(MetaTransaction transaction);
    event VetoGuardianSet(address vetoGuardian, address newVetoGuardian);
    event ProposalVetoed(bytes32 executionPayloadHash);
    event ProposalQueued(bytes32 executionPayloadHash);
    event ProposalExecuted(bytes32 executionPayloadHash);

    /// @notice The delay in seconds between a proposal being queued and the execution of the proposal.
    uint256 public timelockDelay;

    /// @notice The time at which a proposal can be executed. Indexed by the hash of the proposal execution payload.
    mapping(bytes32 => uint256) public proposalExecutionTime;

    /// @notice Veto guardian is given permission to veto any queued proposal.
    address public vetoGuardian;

    /// @notice Constructor
    /// @param _owner Address of the owner of this contract.
    /// @param _spaces Array of whitelisted space contracts.
    /// @param _timelockDelay The timelock delay in seconds.
    /// @param _quorum The quorum required to execute a proposal.
    constructor(address _owner, address[] memory _spaces, uint256 _timelockDelay, uint256 _quorum) {
        setUp(abi.encode(_owner, _spaces, _timelockDelay, _quorum));
    }

    function setUp(bytes memory initializeParams) public initializer {
        (address _owner, address[] memory _spaces, uint256 _timelockDelay, uint256 _quorum) = abi.decode(
            initializeParams,
            (address, address[], uint256, uint256)
        );
        __Ownable_init();
        transferOwnership(_owner);
        __SpaceManager_init(_spaces);
        __SimpleQuorumExecutionStrategy_init(_quorum);
        timelockDelay = _timelockDelay;
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

        uint256 executionTime = block.timestamp + timelockDelay;
        proposalExecutionTime[proposal.executionPayloadHash] = executionTime;

        MetaTransaction[] memory transactions = abi.decode(payload, (MetaTransaction[]));
        for (uint256 i = 0; i < transactions.length; i++) {
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
            bool success;
            if (transactions[i].operation == Enum.Operation.DelegateCall) {
                // solhint-disable-next-line avoid-low-level-calls
                (success, ) = transactions[i].to.delegatecall(transactions[i].data);
            } else {
                (success, ) = transactions[i].to.call{ value: transactions[i].value }(transactions[i].data);
            }
            if (!success) revert ExecutionFailed();

            emit TransactionExecuted(transactions[i]);
        }
        emit ProposalExecuted(executionPayloadHash);
    }

    function veto(bytes32 executionPayloadHash) external {
        if (msg.sender != vetoGuardian) revert OnlyVetoGuardian();
        if (proposalExecutionTime[executionPayloadHash] == 0) revert ProposalNotQueued();

        proposalExecutionTime[executionPayloadHash] = 0;
        emit ProposalVetoed(executionPayloadHash);
    }

    function setVetoGuardian(address newVetoGuardian) external onlyOwner {
        emit VetoGuardianSet(vetoGuardian, newVetoGuardian);
        vetoGuardian = newVetoGuardian;
    }

    function getStrategyType() external pure override returns (string memory) {
        return "SimpleQuorumTimelock";
    }

    /// Receive Functions:

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice IERC165 interface support
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId || interfaceId == type(IERC1155Receiver).interfaceId;
    }
}

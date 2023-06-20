// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SimpleQuorumExecutionStrategy } from "./SimpleQuorumExecutionStrategy.sol";
import { SpaceManager } from "../utils/SpaceManager.sol";
import { MetaTransaction, Proposal, ProposalStatus } from "../types.sol";
import { Enum } from "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/interfaces/IERC1155Receiver.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import { IERC165 } from "@openzeppelin/contracts/interfaces/IERC165.sol";

/// @title Timelock Execution Strategy
/// @notice Used to execute proposal transactions according to a timelock delay.
contract TimelockExecutionStrategy is SimpleQuorumExecutionStrategy, IERC1155Receiver, IERC721Receiver {
    /// @notice Thrown if timelock delay is in the future.
    error TimelockDelayNotMet();

    /// @notice Thrown if the proposal execution payload hash is not queued.
    error ProposalNotQueued();

    /// @notice Thrown if the proposal execution payload hash is already queued.
    error DuplicateExecutionPayloadHash();

    /// @notice Thrown if veto caller is not the veto guardian.
    error OnlyVetoGuardian();

    /// @notice Emitted when a transaction is queued.
    /// @param transaction The transaction that was queued.
    /// @param executionTime The time at which the transaction can be executed.
    event TransactionQueued(MetaTransaction transaction, uint256 executionTime);

    /// @notice Emitted when a transaction is executed.
    /// @param transaction The transaction that was executed.
    event TransactionExecuted(MetaTransaction transaction);

    /// @notice Emitted when a new Timelock is set up.
    /// @param owner The owner of the Timelock.
    /// @param vetoGuardian The veto guardian of the Timelock.
    /// @param spaces The spaces that are whitelisted for this Timelock.
    /// @param quorum The quorum required to execute a proposal.
    /// @param timelockDelay The delay in seconds between a proposal being queued and the execution of the proposal.
    event TimelockExecutionStrategySetUp(
        address owner,
        address vetoGuardian,
        address[] spaces,
        uint256 quorum,
        uint256 timelockDelay
    );

    /// @notice Emitted when a veto guardian is set.
    /// @param vetoGuardian The old veto guardian.
    /// @param newVetoGuardian The new veto guardian.
    event VetoGuardianSet(address vetoGuardian, address newVetoGuardian);

    /// @notice Emitted when the timelock delay is set.
    /// @param timelockDelay The old timelock delay.
    /// @param newTimelockDelay The new timelock delay.
    event TimelockDelaySet(uint256 timelockDelay, uint256 newTimelockDelay);

    /// @notice Emitted when a proposal is vetoed.
    /// @param executionPayloadHash The hash of the proposal execution payload.
    event ProposalVetoed(bytes32 executionPayloadHash);

    /// @notice Emitted when a proposal is queued.
    /// @param executionPayloadHash The hash of the proposal execution payload.
    event ProposalQueued(bytes32 executionPayloadHash);

    /// @notice Emitted when a proposal is executed.
    /// @param executionPayloadHash The hash of the proposal execution payload.
    event ProposalExecuted(bytes32 executionPayloadHash);

    /// @notice The delay in seconds between a proposal being queued and the execution of the proposal.
    uint256 public timelockDelay;

    /// @notice The time at which a proposal can be executed. Indexed by the hash of the proposal execution payload.
    mapping(bytes32 => uint256) public proposalExecutionTime;

    /// @notice Veto guardian is given permission to veto any queued proposal.
    ///         We use a dedicated role for this instead of the owner as a DAO may want to
    ///         renounce ownership of the contract while still maintaining a veto guardian.
    address public vetoGuardian;

    /// @notice Constructor
    /// @param _owner Address of the owner of this contract.
    /// @param _vetoGuardian Address of the veto guardian.
    /// @param _spaces Array of whitelisted space contracts.
    /// @param _timelockDelay The timelock delay in seconds.
    /// @param _quorum The quorum required to execute a proposal.
    constructor(
        address _owner,
        address _vetoGuardian,
        address[] memory _spaces,
        uint256 _timelockDelay,
        uint256 _quorum
    ) {
        setUp(abi.encode(_owner, _vetoGuardian, _spaces, _timelockDelay, _quorum));
    }

    /// @notice Initialization function, should be called immediately after deploying a new proxy to this contract.
    /// @param initParams ABI encoded parameters, in the same order as the constructor.
    function setUp(bytes memory initParams) public initializer {
        (address _owner, address _vetoGuardian, address[] memory _spaces, uint256 _timelockDelay, uint256 _quorum) = abi
            .decode(initParams, (address, address, address[], uint256, uint256));
        __Ownable_init();
        transferOwnership(_owner);
        vetoGuardian = _vetoGuardian;
        __SpaceManager_init(_spaces);
        __SimpleQuorumExecutionStrategy_init(_quorum);
        timelockDelay = _timelockDelay;
        emit TimelockExecutionStrategySetUp(_owner, _vetoGuardian, _spaces, _quorum, _timelockDelay);
    }

    /// @notice Executes a proposal by queueing its transactions in the timelock. Can only be called by approved spaces.
    /// @param proposal The proposal.
    /// @param votesFor The number of votes for the proposal.
    /// @param votesAgainst The number of votes against the proposal.
    /// @param votesAbstain The number of abstaining votes for the proposal.
    /// @param payload The proposal execution payload.
    function execute(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        bytes memory payload
    ) external override onlySpace {
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

    /// @notice Executes a queued proposal.
    /// @param payload The proposal execution payload.
    /// @dev Due to possible reentrancy, one cannot rely on the invariant that proposal payloads are executed atomically.
    ///      As follows: If Proposal A is composed of MetaTransaction a1 and a2, and proposal B of MetaTransaction b1.
    ///      If A.a1 executes code that triggers a proposal execution, then the execution order overall can potentially
    ///      become [A.a1, B.b1, A.a2].
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

    /// @notice Vetoes a queued proposal.
    /// @param executionPayloadHash The hash of the proposal execution payload.
    function veto(bytes32 executionPayloadHash) external onlyVetoGuardian {
        if (proposalExecutionTime[executionPayloadHash] == 0) revert ProposalNotQueued();

        proposalExecutionTime[executionPayloadHash] = 0;
        emit ProposalVetoed(executionPayloadHash);
    }

    /// @notice Sets the veto guardian.
    /// @param newVetoGuardian The new veto guardian.
    function setVetoGuardian(address newVetoGuardian) external onlyOwner {
        emit VetoGuardianSet(vetoGuardian, newVetoGuardian);
        vetoGuardian = newVetoGuardian;
    }

    function setTimelockDelay(uint256 newTimelockDelay) external onlyOwner {
        emit TimelockDelaySet(timelockDelay, newTimelockDelay);
        timelockDelay = newTimelockDelay;
    }

    /// @dev Throws if called by any account other than the veto guardian.
    modifier onlyVetoGuardian() {
        if (msg.sender != vetoGuardian) revert OnlyVetoGuardian();
        _;
    }

    /// @notice Returns the strategy type string.
    function getStrategyType() external pure override returns (string memory) {
        return "SimpleQuorumTimelock";
    }

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
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}

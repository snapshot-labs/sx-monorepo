// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@zodiac/interfaces/IAvatar.sol";
import "./SimpleQuorumExecutionStrategy.sol";
import "../utils/SpaceManager.sol";

/// @title Avatar Execution Strategy - An Execution strategy that executes transactions on an Avatar contract
/// @dev An Avatar contract is any contract that implements the IAvatar interface, eg a Gnosis Safe.
contract AvatarExecutionStrategy is SpaceManager, SimpleQuorumExecutionStrategy {
    error TransactionsFailed();

    /// @dev Emitted each time a new Avatar Execution Strategy is deployed.
    event AvatarExecutionStrategySetUp(address _owner, address _target, address[] _spaces);

    /// @dev Emitted each time the Target is set.
    event TargetSet(address indexed newTarget);

    /// @dev Address of the avatar that this module will pass transactions to.
    address public target;

    /// @notice Constructor
    /// @param _owner Address of the owner of this contract.
    /// @param _target Address of the avatar that this module will pass transactions to.
    /// @param _spaces Array of whitelisted space contracts.
    constructor(address _owner, address _target, address[] memory _spaces) {
        bytes memory initParams = abi.encode(_owner, _target, _spaces);
        setUp(initParams);
    }

    /// @notice Initialize function, should be called immediately after deploying a new proxy to this contract.
    /// @param initParams ABI encoded parameters, in the same order as the constructor.
    /// @notice Can only be called once.
    function setUp(bytes memory initParams) public initializer {
        (address _owner, address _target, address[] memory _spaces) = abi.decode(
            initParams,
            (address, address, address[])
        );
        __Ownable_init();
        transferOwnership(_owner);
        __SpaceManager_init(_spaces);
        target = _target;
        emit AvatarExecutionStrategySetUp(_owner, _target, _spaces);
    }

    /// @notice Sets the target address
    /// @param _target Address of the avatar that this module will pass transactions to.
    function setTarget(address _target) external onlyOwner {
        target = _target;
        emit TargetSet(_target);
    }

    /// @notice Executes a proposal from the avatar contract if the proposal outcome is accepted.
    ///         Must be called by a whitelisted space contract.
    /// @param proposal The proposal to execute.
    /// @param executionParams The encoded transactions to execute.
    function execute(Proposal memory proposal, bytes memory executionParams) external override onlySpace(msg.sender) {
        _execute(executionParams);
    }

    /// @notice Decodes and executes a batch of transactions from the avatar contract.
    /// @param executionParams The encoded transactions to execute.
    function _execute(bytes memory executionParams) internal {
        MetaTransaction[] memory transactions = abi.decode(executionParams, (MetaTransaction[]));
        for (uint256 i = 0; i < transactions.length; i++) {
            bool success = IAvatar(target).execTransactionFromModule(
                transactions[i].to,
                transactions[i].value,
                transactions[i].data,
                transactions[i].operation
            );
            // If any transaction fails, the entire execution will revert
            if (!success) revert TransactionsFailed();
        }
    }
}

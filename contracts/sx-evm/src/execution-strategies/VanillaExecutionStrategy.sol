// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../interfaces/IExecutionStrategy.sol";

contract VanillaExecutionStrategy is IExecutionStrategy {
    error AlreadyExecuted();
    uint256 public executed;

    // solhint-disable no-unused-vars
    function execute(ProposalOutcome proposalOutcome, bytes memory executionParams) external override {
        if (executed == 0) {
            executed = 1;
        } else {
            revert AlreadyExecuted();
        }
    }
}

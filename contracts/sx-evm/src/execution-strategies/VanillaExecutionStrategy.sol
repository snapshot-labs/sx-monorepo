// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../interfaces/IExecutionStrategy.sol";

contract VanillaExecutionStrategy is IExecutionStrategy {
    uint256 numExecuted;

    // solhint-disable no-unused-vars
    function execute(ProposalOutcome proposalOutcome, bytes memory executionParams) external override {
        numExecuted++;
    }
}

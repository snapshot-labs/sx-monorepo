// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./SimpleQuorumExecutionStrategy.sol";

contract VanillaExecutionStrategy is SimpleQuorumExecutionStrategy {
    uint256 numExecuted;

    // solhint-disable no-unused-vars
    function execute(Proposal memory proposal, bytes memory executionParams) external override {
        numExecuted++;
    }
}

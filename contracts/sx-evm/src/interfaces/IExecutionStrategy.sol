// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../types.sol";

interface IExecutionStrategy {
    function execute(ProposalOutcome proposalOutcome, bytes memory executionParams) external;
}

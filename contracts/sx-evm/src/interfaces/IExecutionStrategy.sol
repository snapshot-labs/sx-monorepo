// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

enum ProposalOutcome {
    Accepted,
    Rejected,
    Cancelled
}

interface IExecutionStrategy {
    function execute(ProposalOutcome proposalOutcome, bytes memory executionParams) external;
}

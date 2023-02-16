// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../types.sol";

interface IExecutionStrategy {
    function execute(Proposal memory proposal, bytes memory executionParams) external;

    function getProposalStatus(
        Proposal memory proposal,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain
    ) external view returns (ProposalStatus);
}

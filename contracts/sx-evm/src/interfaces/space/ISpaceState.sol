// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

interface ISpaceState {
    function hasVoted(uint256 proposalId, address voter) external view returns (bool);

    function getProposalInfo(uint256 proposalId) external view returns (bool);
}

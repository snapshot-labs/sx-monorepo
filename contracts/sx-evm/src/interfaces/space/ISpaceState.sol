// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "src/types.sol";

interface ISpaceState {
    function getController() external view returns (address);

    function quorum(uint256 proposalId) external view returns (uint256);

    function maxVotingDuration() external view returns (uint32);

    function minVotingDuration() external view returns (uint32);

    function nextProposalId() external view returns (uint256);

    function proposalThreshold() external view returns (uint256);

    function votingDelay() external view returns (uint32);

    function getProposal(uint256 proposalId) external view returns (Proposal memory);

    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus);

    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
}

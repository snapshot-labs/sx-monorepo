// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Proposal, ProposalStatus } from "src/types.sol";

interface ISpaceState {
    function maxVotingDuration() external view returns (uint32);

    function minVotingDuration() external view returns (uint32);

    function nextProposalId() external view returns (uint256);

    function votingDelay() external view returns (uint32);

    function votingStrategies(uint8) external view returns (address addr, bytes memory params);

    function getProposal(uint256 proposalId) external view returns (Proposal memory);

    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus);

    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
}

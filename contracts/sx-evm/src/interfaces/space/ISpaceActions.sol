// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Choice, IndexedStrategy, Strategy } from "src/types.sol";

interface ISpaceActions {
    function propose(
        address author,
        string calldata metadataURI,
        Strategy calldata executionStrategy,
        bytes calldata userParams
    ) external;

    function vote(
        address voter,
        uint256 proposalId,
        Choice choice,
        IndexedStrategy[] calldata userVotingStrategies,
        string calldata metadataUri
    ) external;

    function execute(uint256 proposalId, bytes calldata payload) external;

    function updateProposal(
        address author,
        uint256 proposalId,
        Strategy calldata executionStrategy,
        string calldata metadataURI
    ) external;
}

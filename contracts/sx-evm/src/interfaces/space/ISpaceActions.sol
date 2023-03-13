// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Choice, IndexedStrategy } from "src/types.sol";

interface ISpaceActions {
    function propose(
        address author,
        string calldata metadataURI,
        IndexedStrategy calldata executionStrategy,
        IndexedStrategy[] calldata userVotingStrategies
    ) external;

    function vote(
        address voterAddress,
        uint256 proposalId,
        Choice choice,
        IndexedStrategy[] calldata userVotingStrategies,
        string calldata metadataUri
    ) external;

    function execute(uint256 proposalId, bytes calldata payload) external;

    function updateProposal(
        address author,
        uint256 proposalId,
        IndexedStrategy calldata executionStrategy,
        string calldata metadataURI
    ) external;
}

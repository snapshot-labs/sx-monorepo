// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "src/types.sol";

interface ISpaceActions {
    function propose(
        address proposerAddress,
        string calldata metadataUri,
        IndexedStrategy calldata executionStrategy,
        IndexedStrategy[] calldata userVotingStrategies
    ) external;

    function vote(
        address voterAddress,
        uint256 proposalId,
        Choice choice,
        IndexedStrategy[] calldata userVotingStrategies
    ) external;

    function execute(uint256 proposalId, bytes calldata payload) external;
}

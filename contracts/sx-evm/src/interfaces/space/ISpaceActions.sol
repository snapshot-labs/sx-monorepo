// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "src/types.sol";

interface ISpaceActions {
    function propose(
        address proposerAddress,
        string calldata metadataUri,
        Strategy calldata executionStrategy,
        IndexedStrategy[] calldata userVotingStrategies
    ) external;

    function vote() external;

    function finalize() external;
}

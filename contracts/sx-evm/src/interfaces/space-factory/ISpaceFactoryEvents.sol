// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../../types.sol";

interface ISpaceFactoryEvents {
    event SpaceCreated(
        address space,
        address owner,
        uint32 votingDelay,
        uint32 minVotingDuration,
        uint32 maxVotingDuration,
        uint256 proposalThreshold,
        string metadataUri,
        Strategy[] votingStrategies,
        address[] authenticators,
        Strategy[] executionStrategies
    );
}

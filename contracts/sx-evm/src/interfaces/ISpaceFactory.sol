// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { ISpaceFactoryErrors } from "./space-factory/ISpaceFactoryErrors.sol";
import { ISpaceFactoryEvents } from "./space-factory/ISpaceFactoryEvents.sol";

import { Strategy } from "../types.sol";

interface ISpaceFactory is ISpaceFactoryErrors, ISpaceFactoryEvents {
    function createSpace(
        address owner,
        uint32 votingDelay,
        uint32 minVotingDuration,
        uint32 maxVotingDuration,
        uint256 proposalThreshold,
        string calldata metadataUri,
        Strategy[] calldata votingStrategies,
        bytes[] calldata votingStrategyMetadata,
        address[] calldata authenticators,
        Strategy[] calldata executionStrategies,
        bytes32 salt
    ) external;
}

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./Space.sol";
import "./interfaces/ISpaceFactory.sol";
import "./types.sol";

/**
 * @title   Space Factory
 * @notice  A contract to deploy and track spaces
 * @author  Snapshot Labs
 */
contract SpaceFactory is ISpaceFactory {
    function createSpace(
        address controller,
        uint32 votingDelay,
        uint32 minVotingDuration,
        uint32 maxVotingDuration,
        uint256 proposalThreshold,
        string calldata metadataUri,
        Strategy[] calldata votingStrategies,
        address[] calldata authenticators,
        Strategy[] calldata executionStrategies,
        bytes32 salt
    ) external override {
        try
            new Space{ salt: salt }(
                controller,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalThreshold,
                votingStrategies,
                authenticators,
                executionStrategies
            )
        returns (Space space) {
            emit SpaceCreated(
                address(space),
                controller,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalThreshold,
                metadataUri,
                votingStrategies,
                authenticators,
                executionStrategies
            );
        } catch {
            revert SpaceCreationFailed();
        }
    }
}

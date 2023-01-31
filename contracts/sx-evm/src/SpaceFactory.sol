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
        uint256 quorum,
        Strategy[] calldata votingStrategies,
        address[] calldata authenticators,
        address[] calldata executionStrategies,
        bytes32 salt
    ) external override {
        try
            new Space{ salt: salt }(
                controller,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalThreshold,
                quorum,
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
                quorum,
                votingStrategies,
                authenticators,
                executionStrategies
            );
        } catch {
            revert SpaceCreationFailed();
        }
    }

    function getSpaceAddress(
        address controller,
        uint32 votingDelay,
        uint32 minVotingDuration,
        uint32 maxVotingDuration,
        uint256 proposalThreshold,
        uint256 quorum,
        Strategy[] memory votingStrategies,
        address[] memory authenticators,
        address[] memory executionStrategies,
        bytes32 salt
    ) external view override returns (address) {
        return
            address(
                uint160(
                    uint(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                address(this),
                                salt,
                                keccak256(
                                    abi.encodePacked(
                                        type(Space).creationCode,
                                        abi.encode(
                                            controller,
                                            votingDelay,
                                            minVotingDuration,
                                            maxVotingDuration,
                                            proposalThreshold,
                                            quorum,
                                            votingStrategies,
                                            authenticators,
                                            executionStrategies
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            );
    }
}

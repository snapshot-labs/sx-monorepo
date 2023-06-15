// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SXUtils } from "./SXUtils.sol";
import { IndexedStrategy, Strategy } from "../types.sol";
import { IVotingStrategy } from "../interfaces/IVotingStrategy.sol";

/// @title Proposition Power Proposal Validation Strategy Module
/// @notice This module allows a proposal to be validated based on the proposition power of an author exceeding
///         a threshold over a set of voting strategies.
/// @dev The voting strategies used here are configured independently of the strategies set in the Space.
abstract contract PropositionPower {
    using SXUtils for IndexedStrategy[];

    /// @notice Thrown when an invalid strategy index is supplied.
    error InvalidStrategyIndex(uint256 index);

    /// @dev Validates an author based on the voting power of the author exceeding a threshold over a set of strategies.
    function _validate(
        address author,
        uint256 proposalThreshold,
        Strategy[] memory allowedStrategies,
        IndexedStrategy[] memory userStrategies
    ) internal returns (bool) {
        uint256 votingPower = _getCumulativePower(author, uint32(block.timestamp), userStrategies, allowedStrategies);
        return (votingPower >= proposalThreshold);
    }

    /// @dev Computes the cumulative proposition power of an address at a given timestamp over a set of strategies.
    function _getCumulativePower(
        address userAddress,
        uint32 timestamp,
        IndexedStrategy[] memory userStrategies,
        Strategy[] memory allowedStrategies
    ) internal returns (uint256) {
        // Ensure there are no duplicates to avoid an attack where people double count a strategy.
        userStrategies.assertNoDuplicateIndicesMemory();

        uint256 totalVotingPower;
        for (uint256 i = 0; i < userStrategies.length; ++i) {
            uint256 strategyIndex = userStrategies[i].index;
            if (strategyIndex >= allowedStrategies.length) revert InvalidStrategyIndex(strategyIndex);
            Strategy memory strategy = allowedStrategies[strategyIndex];

            totalVotingPower += IVotingStrategy(strategy.addr).getVotingPower(
                timestamp,
                userAddress,
                strategy.params,
                userStrategies[i].params
            );
        }
        return totalVotingPower;
    }
}

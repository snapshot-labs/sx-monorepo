// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IndexedStrategy, Strategy } from "../types.sol";
import { IVotingStrategy } from "src/interfaces/IVotingStrategy.sol";

error DuplicateFound(uint8 index);
error InvalidStrategyIndex(uint256 index);

/**
 * @notice  Internal function to ensure there are no duplicates in an array of `UserVotingStrategy`.
 * @dev     We create a bitmap of those indices by using a `u256`. We try to set the bit at index `i`, stopping it
 * @dev     it has already been set. Time complexity is O(n).
 * @param   strats  Array to check for duplicates.
 */
function _assertNoDuplicateIndices(IndexedStrategy[] memory strats) pure {
    if (strats.length < 2) {
        return;
    }

    uint256 bitMap;
    for (uint256 i = 0; i < strats.length; ++i) {
        // Check that bit at index `strats[i].index` is not set
        uint256 s = 1 << strats[i].index;
        if (bitMap & s != 0) revert DuplicateFound(strats[i].index);
        // Update aforementioned bit.
        bitMap |= s;
    }
}

library GetCumulativePower {
    /**
     * @notice  Loop over the strategies and return the cumulative power.
     * @dev
     * @param   timestamp  Timestamp of the snapshot.
     * @param   userAddress  Address for which to compute the voting power.
     * @param   userStrategies The desired voting strategies to check.
     * @param   allowedStrategies The array of strategies that are used for this proposal.
     * @return  uint256  The total voting power of a user (over those specified voting strategies).
     */
    function getCumulativePower(
        address userAddress,
        uint32 timestamp,
        IndexedStrategy[] memory userStrategies,
        Strategy[] memory allowedStrategies
    ) internal returns (uint256) {
        // Ensure there are no duplicates to avoid an attack where people double count a strategy
        _assertNoDuplicateIndices(userStrategies);

        uint256 totalVotingPower;
        for (uint256 i = 0; i < userStrategies.length; ++i) {
            uint256 strategyIndex = userStrategies[i].index;
            if (strategyIndex >= allowedStrategies.length) revert InvalidStrategyIndex(strategyIndex);
            Strategy memory strategy = allowedStrategies[strategyIndex];
            // A strategy address set to 0 indicates that this address has already been removed and is
            // no longer a valid voting strategy. See `_removeVotingStrategies`.
            if (strategy.addr == address(0)) revert InvalidStrategyIndex(strategyIndex);

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

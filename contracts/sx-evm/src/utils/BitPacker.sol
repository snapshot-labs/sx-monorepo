// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/// @title Library for setting and checking bits in a uint256.
library BitPacker {
    /// @dev Sets the bit at the given index to the given value.
    function setBit(uint256 value, uint8 index, bool bit) internal pure returns (uint256) {
        uint256 mask = 1 << index;
        if (bit) {
            return value | mask;
        } else {
            return value & ~mask;
        }
    }

    /// @dev Returns true if the bit at the given index is set.
    function isBitSet(uint256 value, uint8 index) internal pure returns (bool) {
        uint256 mask = 1 << index;
        return (value & mask) != 0;
    }
}

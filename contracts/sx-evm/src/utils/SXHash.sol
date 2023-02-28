// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "src/types.sol";

/// @title SX Types Hashing Library
/// @notice This library contains functions for hashing SX types for use in eip712 signatures.
library SXHash {
    bytes32 private constant STRATEGY_TYPEHASH = keccak256("Strategy(address addy,bytes params)");
    bytes32 private constant INDEXED_STRATEGY_TYPEHASH = keccak256("IndexedStrategy(uint8 index,bytes params)");

    function hash(Strategy memory strategy) internal pure returns (bytes32) {
        return keccak256(abi.encode(STRATEGY_TYPEHASH, strategy.addy, keccak256(strategy.params)));
    }

    function hash(IndexedStrategy[] memory indexedStrategies) internal pure returns (bytes32) {
        bytes32[] memory indexedStrategyHashes = new bytes32[](indexedStrategies.length);
        for (uint256 i = 0; i < indexedStrategies.length; i++) {
            indexedStrategyHashes[i] = keccak256(
                abi.encode(
                    INDEXED_STRATEGY_TYPEHASH,
                    indexedStrategies[i].index,
                    keccak256(indexedStrategies[i].params)
                )
            );
        }
        return keccak256(abi.encodePacked(indexedStrategyHashes));
    }

    function hash(IndexedStrategy memory indexedStrategy) internal pure returns (bytes32) {
        return
            keccak256(abi.encode(INDEXED_STRATEGY_TYPEHASH, indexedStrategy.index, keccak256(indexedStrategy.params)));
    }
}

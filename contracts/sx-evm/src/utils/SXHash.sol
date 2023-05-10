// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IndexedStrategy, Strategy } from "src/types.sol";

/// @title Snapshot X Types Hashing Library
/// @notice For use in EIP712 signatures.
library SXHash {
    bytes32 private constant STRATEGY_TYPEHASH = keccak256("Strategy(address addr,bytes params)");
    bytes32 private constant INDEXED_STRATEGY_TYPEHASH = keccak256("IndexedStrategy(uint8 index,bytes params)");

    /// @dev Hashes a Strategy type.
    function hash(Strategy memory strategy) internal pure returns (bytes32) {
        return keccak256(abi.encode(STRATEGY_TYPEHASH, strategy.addr, keccak256(strategy.params)));
    }

    /// @dev Hashes an array of IndexedStrategy types.
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

    /// @dev Hashes an IndexedStrategy type.
    function hash(IndexedStrategy memory indexedStrategy) internal pure returns (bytes32) {
        return
            keccak256(abi.encode(INDEXED_STRATEGY_TYPEHASH, indexedStrategy.index, keccak256(indexedStrategy.params)));
    }
}
